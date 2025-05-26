<h1 align="center">
  <a href="https://dbsurface.com">
    <img 
      src="public/logo_and_name.png" 
      alt="dbSurface" 
      width="550"      
      style="height: auto;"
    />
  </a>
</h1>

[dbSurface](https://dbsurface.com) is a SQL editor made for pgvector.

---

### Get Started

(Docker setup)

### Support

If you're missing a feature, have a question, or have found a bug, please open a
[GitHub Issue](https://github.com/Z-Gort/dbSurface/issues/new).

### Notes on Projection Creation

How long projection creation takes depends largely on the restricted connection string you input. A few million rows can take anywhere from ~15-55 minutes depending on the concurrent connection limit and database egress bandwith limits. 

We have tested with a connection string allowing 30 concurrent connections you can achieve ~20 minute creation on 2 million rows.

Also note modifying your schema while a projection is being created may cause creation failure.

## License

dbSurface is licensed under the [GNU Affero General Public License v3.0](LICENSE).


