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


<p align="center">
  <img
    src="https://github.com/user-attachments/assets/1a288048-f744-41e6-8e71-3805ce39a71a"
    alt="readmeGif"
    width="800"
  />
</p>

---


## Get Started
Run: 
```bash
  docker pull dbsurface/dbsurface
  docker run -p 4800:3000 dbsurface/dbsurface:latest
  ```
Then head to http://localhost:4800 and you can get going!

## Support

If you're missing a feature, have a question, or have found a bug, please open a
[GitHub Issue](https://github.com/Z-Gort/dbSurface/issues/new).

## Notes on Projection Creation

How long projection creation takes depends largely on the restricted connection string you input. A few million rows can take anywhere from ~15-55 minutes depending on the concurrent connection limit and database egress bandwith limits. 

For reference, we've tested it takes ~5mins to project 500k rows and ~2hrs to project 10M rows from a Supabase database with the Small compute add-on.

Also note modifying your schema while a projection is being created may cause creation failure.

## License

dbSurface is licensed under the [GNU Affero General Public License v3.0](LICENSE).


