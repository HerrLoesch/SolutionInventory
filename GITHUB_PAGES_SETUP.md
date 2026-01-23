# GitHub Pages Setup Instructions

## Automatic Deployment Configuration

This project uses GitHub Actions to automatically build and deploy to GitHub Pages.

### Prerequisites

1. Repository must be **public** (free GitHub Pages) or you have **GitHub Pro** (private repos)
2. Repository settings must allow GitHub Actions

### Automated Workflow

The workflow file `.github/workflows/build-and-deploy.yml` performs:

1. **Build**: 
   - Installs Node.js 18
   - Runs `npm ci` to install dependencies
   - Runs `npm run build` to create optimized production build
   - Uploads `dist/` directory as artifact

2. **Deploy**:
   - Only on successful build from main branch
   - Automatically deploys to GitHub Pages using GitHub's `deploy-pages` action
   - URL: `https://<username>.github.io/SolutionInventory/`

### Enable GitHub Pages

1. Go to **Settings** → **Pages** in your repository
2. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - **Branch**: Automatically uses main
3. Click **Save**

Wait for first deployment to complete (~2-3 minutes).

### Verify Deployment

1. Go to **Settings** → **Pages** 
2. Look for "Your site is live at: https://..."
3. Or check **Actions** tab to see workflow runs

### Troubleshooting

**Build fails**: Check the Actions tab for detailed error logs
- Common issues: missing dependencies, Node version incompatibility

**Deploy fails**: Ensure GitHub Pages is enabled in Settings → Pages

**Site not loading**: 
- Wait 5-10 minutes for propagation
- Check that the base URL in `vite.config.js` matches your repo name

### Manual Trigger

To manually trigger a deployment without committing code:
1. Go to **Actions** tab
2. Select "Build and Deploy to GitHub Pages" workflow
3. Click "Run workflow" → "Run workflow" button

### Local Testing

To test the production build locally before pushing:

```bash
npm run build
npm run preview
# Opens at http://localhost:4173/SolutionInventory/
```

### Rollback

If something breaks, GitHub Pages keeps the previous deployment for 24 hours. You can:
1. Go to Settings → Pages
2. (Deprecated) Roll back to previous version (if available)
3. OR: Push a fix to main branch and wait for redeployment

### Advanced Configuration

To customize deployment behavior, edit `.github/workflows/build-and-deploy.yml`:
- Change Node version: modify `node-version: 18` 
- Change build command: modify `npm run build`
- Add environment variables: add to `env:` section
