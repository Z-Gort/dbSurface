def finalize_projection(metadata, digest_by_col, projection_id, supabase, num_rows):
    """finish metadata creation, upload metadata to supabase, update supabase projection status"""
    import json

    color_stats = {}

    for col, digest in digest_by_col.items():
        cuts = [digest.percentile(p) for p in range(0, 101, 10)]
        color_stats[col] = {"buckets": cuts}

    final_metadata = {
        "extent": {
            "size": 100,
        },
        "tiles": metadata,
        "colorStats": color_stats,
    }

    print("final metadata", final_metadata)

    path = "/tmp/tiles/metadata.json"
    with open(path, "w") as f:
        json.dump(final_metadata, f, indent=2)
    supabase.storage.from_("quadtree-tiles").upload(
        f"{projection_id}/metadata.json", path
    )
    supabase.table("projections").update(
        {"status": "live", "number_points": num_rows}
    ).eq("projection_id", projection_id).execute()


def make_arrow_schema(run_dir: str, vector_col: str, primary_key_col: str):
    import glob, pyarrow.dataset as ds, pyarrow as pa, os

    files = [
        f
        for f in glob.glob(os.path.join(run_dir, "*.arrow"))
        if not f.endswith("xy.arrow")
    ]
    ds_obj = ds.dataset(files, format="arrow")
    orig = ds_obj.schema

    fields = [
        pa.field("x", pa.float32()),
        pa.field("y", pa.float32()),
    ]

    for field in orig:
        if field.name == vector_col:
            continue
        if field.name == primary_key_col:
            fields.append(pa.field("ix", field.type))
            continue
        if pa.types.is_timestamp(field.type):
            tz = field.type.tz or "UTC"
            ts_ms = pa.timestamp("ms", tz=tz)
            fields.append(pa.field(f"user_{field.name}", ts_ms))
            continue
        if pa.types.is_decimal(field.type):
            fields.append(pa.field(f"user_{field.name}", pa.float32()))
            continue

        fields.append(pa.field(f"user_{field.name}", field.type))

    return pa.schema(fields)


def get_timestamp_cols(arrow_schema):
    import pyarrow as pa

    timestamp_columns = []

    for field in arrow_schema:
        name = field.name
        if name in ("x", "y", "ix"):
            continue

        if pa.types.is_timestamp(field.type):
            timestamp_columns.append(name)

    return timestamp_columns


def get_digest_by_col(arrow_schema):
    import pyarrow as pa
    from tdigest import TDigest

    digest_by_column = {}

    for field in arrow_schema:
        name = field.name
        if name in ("x", "y", "ix"):
            continue

        if (
            pa.types.is_integer(field.type)
            or pa.types.is_floating(field.type)
            or pa.types.is_timestamp(field.type)
        ):
            digest_by_column[name] = TDigest()

    return digest_by_column


def upload_to_supabase(local_path, remote_path, supabase, bucket="quadtree-tiles"):
    for attempt in range(4):
        try:
            supabase.storage.from_(bucket).upload(remote_path, local_path)
            break
        except Exception as e:
            print("failed to upload to supabase", e)
            if attempt == 3:
                raise e
