class QuadTree:
    """Splits (x, y, idx) items into quadtree tiles."""
    MAX_TILE_POINTS = 64_000

    def __init__(self, center_x, center_y, size, depth=0):
        self.nodes = []
        self.children = []
        self.center = [center_x, center_y]
        self.size = size  # distance from center to edge
        self.depth = depth

    def insert(self, item):
        if len(self.children) == 0:
            self.nodes.append(item)

            if len(self.nodes) > self.MAX_TILE_POINTS:
                self.split()
        else:
            self.insert_into_children(item)

    #    0  |  2
    #    -------
    #    1  |  3
    def insert_into_children(self, item):
        if item[0] <= self.center[0]:
            if item[1] <= self.center[1]:
                self.children[0].insert(item)
            else:
                self.children[1].insert(item)
        else:
            if item[1] <= self.center[1]:
                self.children[2].insert(item)
            else:
                self.children[3].insert(item)

    def split(self):
        self.children = [
            QuadTree(
                self.center[0] - self.size / 2,
                self.center[1] - self.size / 2,
                self.size / 2,
                self.depth + 1,
            ),
            QuadTree(
                self.center[0] - self.size / 2,
                self.center[1] + self.size / 2,
                self.size / 2,
                self.depth + 1,
            ),
            QuadTree(
                self.center[0] + self.size / 2,
                self.center[1] - self.size / 2,
                self.size / 2,
                self.depth + 1,
            ),
            QuadTree(
                self.center[0] + self.size / 2,
                self.center[1] + self.size / 2,
                self.size / 2,
                self.depth + 1,
            ),
        ]
        newest = self.nodes.pop()
        self.insert_into_children(newest)

    def print_tree(self, indent=0):
        spacing = " " * indent
        print(
            f"{spacing}Depth: {self.depth} | Center: {self.center} | Size: {self.size} | Nodes: {len(self.nodes)}"
        )
        print(f"{spacing} Node values: {self.nodes}")
        for i, child in enumerate(self.children):
            print(f"{spacing} Child {i}:")
            child.print_tree(indent + 4)