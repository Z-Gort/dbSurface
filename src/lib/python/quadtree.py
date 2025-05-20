class QuadTree:
    """Splits (x, y, idx) items into quadtree tiles."""

    MAX_TILE_POINTS = 64000
    BETA = 0.5
    ALPHA = 1

    def __init__(
        self, center_x, center_y, size, items, depth=0
    ):  # items are a list of (x, y, idx)
        self.nodes = []
        self.children = []
        self.center = [center_x, center_y]
        self.size = size  # distance from center to edge
        self.depth = depth

        print("inited node: ", self.center, self.size)
        self.build(items)

    def build(self, items):
        print("starting build")
        if len(items) <= self.MAX_TILE_POINTS:
            self.nodes = items
            self.children = []
            return

        synthetic_sample = self.get_synthetic_sample(items)
        print("got synthetic sample")
        real_sample = self.snap_to_real(synthetic_sample, items)
        print("got real sample")
        self.nodes = real_sample

        sampled_idxs = {pt[2] for pt in real_sample}
        remaining_items = [pt for pt in items if pt[2] not in sampled_idxs]
        quad_list = self.get_quad_lists(remaining_items)
        self.split(quad_list)

    def get_quad_lists(self, items):
        #    0  |  2
        #    -------
        #    1  |  3
        quad_list = [[], [], [], []]
        for item in items:
            if item[0] <= self.center[0]:
                if item[1] <= self.center[1]:
                    quad_list[0].append(item)
                else:
                    quad_list[1].append(item)
            else:
                if item[1] <= self.center[1]:
                    quad_list[2].append(item)
                else:
                    quad_list[3].append(item)
        return quad_list

    def get_synthetic_sample(self, items):
        """Takes items and returns ideal synthetic points as np.ndarray of shape (M,2)"""
        from scipy.stats import gaussian_kde
        import numpy as np

        coords = np.stack([[x, y] for x, y, _ in items])  # shape (n,2)

        # Estimate density
        kde = gaussian_kde(coords.T, bw_method="scott")
        dens = kde(coords.T)  # shape (n,)

        print("got density")

        # Compute the same weight formula
        w = (1 - self.BETA) + self.BETA * (1.0 / (dens**self.ALPHA))
        w /= w.sum()

        # Sample
        idx = np.random.choice(
            len(coords), size=self.MAX_TILE_POINTS, replace=False, p=w
        )
        print("sampled from density")
        synthetic = coords[idx]
        return synthetic

    def snap_to_real(self, synthetic, items):
        from sklearn.neighbors import KDTree
        import numpy as np
        import random
        """
        synthetic : np.ndarray of shape (M,2)  — “ideal” floats
        items     : list of (x, y, idx)        — the full real dataset at this node

        Returns a list of (x, y, idx) real points, one per synthetic sample (deduped).
        """
        # Extract coords into an (n,2) array
        coords = np.array([[x, y] for x, y, _ in items])
        print("About to build kd-tree")
        # Build the KD-tree on those coords
        tree = KDTree(coords, leaf_size=40)
        print("built kdtree")

        #  Query each synthetic point’s nearest neighbor
        #  dists: (M,1), idxs: (M,1) into the coords/items array
        dists, idxs = tree.query(synthetic, k=1)
        idxs = idxs.ravel()  # shape (M,)

        # Deduplicate while preserving order
        seen = set()
        real_sample = []
        for i in idxs:
            if i not in seen:
                seen.add(i)
                real_sample.append(items[i])

        # If we’re short, fill up with random unused points
        if len(real_sample) < self.MAX_TILE_POINTS:
            all_indices = set(range(len(items)))
            unused = list(all_indices - seen)
            need = self.MAX_TILE_POINTS - len(real_sample)

            if len(unused) <= need:
                fill_idxs = unused
            else:
                fill_idxs = random.sample(unused, need)

            for i in fill_idxs:
                real_sample.append(items[i])
        print("got real sample")

        return real_sample

    def split(self, quad_lists):
        self.children = [
            QuadTree(
                self.center[0] - self.size / 2,
                self.center[1] - self.size / 2,
                self.size / 2,
                quad_lists[0],
                self.depth + 1,
            ),
            QuadTree(
                self.center[0] - self.size / 2,
                self.center[1] + self.size / 2,
                self.size / 2,
                quad_lists[1],
                self.depth + 1,
            ),
            QuadTree(
                self.center[0] + self.size / 2,
                self.center[1] - self.size / 2,
                self.size / 2,
                quad_lists[2],
                self.depth + 1,
            ),
            QuadTree(
                self.center[0] + self.size / 2,
                self.center[1] + self.size / 2,
                self.size / 2,
                quad_lists[3],
                self.depth + 1,
            ),
        ]

    def print_tree(self, indent=0):
        spacing = " " * indent
        print(
            f"{spacing}Depth: {self.depth} | Center: {self.center} | Size: {self.size} | Items: {len(self.nodes)}"
        )
        # print(f"{spacing} Item values: {self.nodes[0:10]}")
        for i, child in enumerate(self.children):
            print(f"{spacing} Child {i}:")
            child.print_tree(indent + 4)