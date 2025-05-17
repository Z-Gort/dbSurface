import modal

rapids_image_old = (
    modal.Image.from_registry("rapidsai/base:25.04a-cuda12.8-py3.11")
    .apt_install("build-essential")
    .pip_install("psycopg2-binary")
    .pip_install("scikit-learn")
    .pip_install("numpy")
    .pip_install("pyarrow")
    .pip_install("supabase")
    .pip_install("zstandard")
    .pip_install("tdigest")
    .pip_install("pgvector")
    .add_local_python_source("utils")
)

app = modal.App("create projection")

MOUNT = "/cache"

with modal.Volume.ephemeral() as vol:

    @app.function(
        image=modal.Image.debian_slim()
        .pip_install("psycopg[binary]", "supabase")
        .add_local_python_source("utils"),
        secrets=[modal.Secret.from_name("supabase-credentials")],
        volumes={MOUNT: vol},
        timeout=7200,
    )
    def orchestrator(
        schema: str,
        table: str,
        vector_col: str,
        primary_key_col: str,
        projection_id: str,
        database_id: str,
        total_rows: str,
    ):
        from utils import get_num_shards, get_creds, failed
        import os
        from supabase import create_client

        run_dir = f"{MOUNT}/{projection_id}"
        os.makedirs(run_dir, exist_ok=True)
        vol.commit()

        supabase_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"],
        )
        try: 
            total_rows = int(total_rows)
            creds = get_creds(database_id)
            NUM_SHARDS = get_num_shards(total_rows, creds)
            print(f"NUM_SHARDS: {NUM_SHARDS}")

            const_kw = dict(
                schema=schema,
                table=table,
                vector_col=vector_col,
                primary_key_col=primary_key_col,
                total_shards=NUM_SHARDS,
                creds=creds,
                run_dir=run_dir,
            )
            shard_ids = list(range(NUM_SHARDS))
            wave_size = NUM_SHARDS
            while shard_ids:
                failed, ok = run_wave(shard_ids, wave_size, const_kw)
                if not failed:
                    print(f"✅  All {ok} shards completed successfully")
                    break

                prev = wave_size
                wave_size = max(1, wave_size // 2)
                shard_ids = failed
                print(
                    f"↩︎  {ok} shards ok, {len(failed)} hit pool limit; "
                    f"retrying with wave_size={wave_size} (was {prev})"
                )
            embed_to_2d.spawn(primary_key_col, vector_col, run_dir, projection_id)
        except Exception:
            failed(supabase_client, projection_id)

    @app.function(
        image=modal.Image.debian_slim()
        .pip_install("psycopg[binary]", "pyarrow", "pgvector", "supabase")
        .add_local_python_source("utils"),
        volumes={MOUNT: vol},
        timeout=7200,  # 2 hours (should not reach 2 hours though)
    )
    def fetch_table(
        shard_id: int,
        *,
        schema: str,
        table: str,
        vector_col: str,
        primary_key_col: str,
        total_shards: int,
        creds,
        run_dir: str,
    ):
        """Write postgres table shard to /cache/<shard>.arrow"""
        from utils import fetch_table_helper
        import os

        vol.reload()  # needed if this container was not triggered by this invocation of the function
        fetch_table_helper(
            shard_id,
            schema,
            table,
            vector_col,
            primary_key_col,
            total_shards,
            creds,
            run_dir,
            vol,
        )

    @app.function(
        image=modal.Image.from_registry("rapidsai/base:25.04a-cuda12.8-py3.11")
        .apt_install("build-essential")
        .pip_install("scikit-learn")
        .pip_install("numpy")
        .pip_install("supabase")
        .pip_install("pyarrow")
        .add_local_python_source("utils"),
        secrets=[modal.Secret.from_name("supabase-credentials")],
        gpu="T4",
        timeout=60 * 15,
        volumes={MOUNT: vol},
    )
    def embed_to_2d(
        primary_key_col: str,
        vector_col: str,
        run_dir: str,
        projection_id: str,
        target_gpu_mem: float = 6e9,
        n_neighbors: int = 15,
        batch_rows: int = 100_000,
    ) -> str:
        """
        Write primary_key, x, y to /cache/xy.arrow
        """
        from utils import embed_to_2d_helper, failed
        from supabase import create_client
        import os

        vol.reload()

        supabase_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"],
        )
        try: 
            embed_to_2d_helper(
                vector_col,
                run_dir,
                vol,
                target_gpu_mem,
                n_neighbors,
                batch_rows,
            )

            upload_tiles.spawn(run_dir, projection_id, vector_col, primary_key_col)
        except Exception:
            failed(supabase_client, projection_id)

    @app.function(
        image=modal.Image.debian_slim()
        .pip_install("pyarrow")
        .pip_install("supabase")
        .pip_install("zstandard")
        .pip_install("tdigest")
        .add_local_python_source(
            "tile_uploader_utils", "tile_uploader", "quadtree", "utils"
        ),
        secrets=[modal.Secret.from_name("supabase-credentials")],
        volumes={MOUNT: vol},
    )
    def upload_tiles(
        run_dir: str, projection_id: str, vector_col: str, primary_key_col: str
    ):
        from tile_uploader import TileUploader
        from quadtree import QuadTree
        import os, pyarrow.ipc as ipc, pyarrow.dataset as ds
        from supabase import create_client
        from tile_uploader_utils import (
            make_arrow_schema,
            get_timestamp_cols,
            get_digest_by_col,
            finalize_projection,
        )
        from utils import failed
        
        supabase_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"],
        )
        try: 

            print("starting upload tiles")
            vol.reload()

            qt = QuadTree(50, 50, 50)  # recall we normalized to 100x100

            xy_path = os.path.join(run_dir, "xy.arrow")
            reader = ipc.open_file(xy_path)
            table = reader.read_all()
            cols = table.to_pydict()

            for x, y, idx in zip(cols["x"], cols["y"], cols["row-index"]):
                qt.insert((float(x), float(y), int(idx)))

            print("quadtree built")

            arrow_schema = make_arrow_schema(run_dir, vector_col, primary_key_col)
            timestamp_cols = get_timestamp_cols(arrow_schema)
            digest_by_col = get_digest_by_col(arrow_schema)

            uploader = TileUploader(
                run_dir=run_dir,
                projection_id=projection_id,
                supabase_client=supabase_client,
                arrow_schema=arrow_schema,
                timestamp_cols=timestamp_cols,
                digest_by_col=digest_by_col,
                metadata={},
                vector_col=vector_col,
                primary_key_col=primary_key_col,
            )

            uploader.recurse(qt)
            updated_metadata = uploader.metadata
            updated_digest_by_col = uploader.digest_by_col
            num_rows = uploader.num_rows

            finalize_projection(
                updated_metadata,
                updated_digest_by_col,
                projection_id,
                supabase_client,
                num_rows,
            )
        except Exception:
            failed(supabase_client, projection_id)


@app.function(image=modal.Image.debian_slim().pip_install("fastapi[standard]"))
@modal.fastapi_endpoint()
def create_projection(
    schema: str,
    table: str,
    vector_col: str,
    primary_key_col: str,
    projection_id: str,
    database_id: str,
    total_rows: str,
):
    orchestrator.spawn(
        schema,
        table,
        vector_col,
        primary_key_col,
        projection_id,
        database_id,
        total_rows,
    )
    return {"status": "started"}  # return immidiately to avoid https timeout


def run_wave(shard_ids, wave_size, const_kw):
    """
    Run shard_ids in batches of wave_size.
    Return (failed_ids, ok_count).
    """
    failed, ok = [], 0

    for i in range(0, len(shard_ids), wave_size):
        batch = shard_ids[i : i + wave_size]
        results = list(
            fetch_table.map(
                batch,
                kwargs=const_kw,
                return_exceptions=True,
            )
        )

        for sid, res in zip(batch, results):
            if isinstance(res, Exception):
                msg = str(res).lower()
                if "max client connections" in msg or "too many clients already" in msg:
                    print(f"→ shard {sid} will be retried (pool limit hit)")
                    failed.append(sid)
                else:
                    print(f"‼️ shard {sid} raised an unretryable error: {repr(res)}")
                    raise res
            else:
                ok += 1

    return failed, ok
