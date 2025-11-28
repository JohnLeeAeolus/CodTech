# Netlify Deployment Guide

## Option 1: Deploy via Netlify CLI (Recommended)

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify
```bash
netlify login
```
This will open your browser to authenticate.

### Step 3: Initialize Netlify in your project
```bash
netlify init
```
Follow the prompts:
- Create & configure a new site
- Choose your team
- Site name (or press enter for auto-generated)
- Build command: `npm run build`
- Directory to deploy: `dist`

### Step 4: Deploy
```bash
netlify deploy --prod
```

## Option 2: Deploy via Netlify Web Interface

### Step 1: Push your code to GitHub/GitLab/Bitbucket
1. Create a repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Connect to Netlify
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository

### Step 3: Configure Build Settings
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- Click "Deploy site"

## Important Notes

- The `netlify.toml` file is already configured
- Make sure all your files are committed to Git
- The build will automatically run on every push to your main branch
- Your site will be available at: `https://your-site-name.netlify.app`

## Troubleshooting

If you encounter issues:
1. Check the build logs in Netlify dashboard
2. Make sure `node_modules` is in `.gitignore` (already done)
3. Ensure all dependencies are in `package.json`
4. Verify the build command works locally: `npm run build`

