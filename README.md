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

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/1a288048-f744-41e6-8e71-3805ce39a71a"
    alt="readmeGif"
    width="800"
  />
</p>

---
## Overview

*dbSurface is the SQL editor for pgvector*:

- Generate interactive 2D projections of your PostgreSQL tables containing vectors  
- Run SQL queries across the projection (while still querying your database locally)
- Visualize and compare query results in real time  
- Assess query precision with built-in metrics  
- Work with vector data in an intuitive way! 🚀

## Get Started
Run: 
```bash
  docker pull dbsurface/dbsurface
  docker run -p 4800:3000 dbsurface/dbsurface:latest
  ```
Then head to http://localhost:4800 and you can get going!

## How dbSurface Works

1. **Spin up locally**  
   Run our Docker image — this starts the dashboard at `http://localhost:4800`.

2. **Connect your database**  
   Provide two connection strings:  
   - Query string: Powers queries from your browser straight to PostgreSQL  
   - Read-only string: Used by our secure cloud worker to grab a snapshot of your table for projection creation

3. **Create a projection**  
   Our cloud worker pulls the selected table using the read-only string, runs dimensionality reduction on the vector column, adds 2D coordinates, and stores the result as Apache Arrow files.

4. **Explore & Query**  
   Your local dashboard streams queries directly from your database in both the SQL editor and projection view.

> **Security**  
> All credentials and snapshots are encrypted in transit and at rest (leveraging Supabase & Cloudflare best practices). Your live queries never leave your machine.  

## Support

If you're missing a feature, have a question, or have found a bug, please open a
[GitHub Issue](https://github.com/Z-Gort/dbSurface/issues/new).

## Notes on Projection Creation

How long projection creation takes depends largely on the restricted connection string you input. A few million rows can take anywhere from ~15-55 minutes depending on the concurrent connection limit and database egress bandwith limits. 

For reference, we've tested it takes ~5mins to project 500k rows and ~2hrs to project 10M rows from a Supabase database with the Small compute add-on.

Also note modifying your schema while a projection is being created may cause creation failure.

## License

dbSurface is licensed under the [GNU Affero General Public License v3.0](LICENSE).


