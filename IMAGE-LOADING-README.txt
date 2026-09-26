BeautyFlow image loading upgrade
Base commit: f8a1e85 (Speed up BeautyFlow design and image loading)

1. Unzip this archive into the BeautyFlow project directory.
2. Run npm install (sharp is now a direct dependency).
3. Run npm run build. If it succeeds, deploy through the normal git workflow.
4. Existing salon pictures are not changed merely by deploying. To optimize them without deleting the originals, run once on your local machine from the project directory with .env.local present:
   node --env-file=.env.local scripts/optimize-existing-media.mjs
   node --env-file=.env.local scripts/optimize-existing-media.mjs --apply
   The first command counts candidates without changing anything. The second uploads smaller WebP copies and updates the image URLs in the database only after each copy uploads successfully. Old files remain available. Run with your own service role credentials only on your own computer; never share .env.local.
5. New images are resized on upload automatically. Existing salon and service images benefit after step 4. Visible salon cover and service photos also start fetching earlier after deployment. Static homepage phone image and mobile hero changes benefit immediately after deployment.
