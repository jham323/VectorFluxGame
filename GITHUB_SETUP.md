# GitHub Setup Guide for Vector Flux

Since we're encountering issues with the automatic push to GitHub, here's a step-by-step guide to complete the process manually:

## 1. Create the Repository on GitHub

1. Go to [GitHub's New Repository page](https://github.com/new)
2. Enter "Vector-Flux" as the repository name
3. Add a description (optional): "A retro-futuristic arcade space shooter with vibrant neon visuals"
4. Choose whether to make it public or private
5. **Important**: Do NOT initialize with a README, .gitignore, or license (since we already have these files)
6. Click "Create repository"

## 2. Set Up Authentication

### Option A: Use a Personal Access Token (Recommended)

1. Go to [GitHub's Personal Access Tokens page](https://github.com/settings/tokens)
2. Click "Generate new token" (classic)
3. Give it a name like "Vector Flux Push"
4. Select the "repo" scope (full control of private repositories)
5. Click "Generate token"
6. **Important**: Copy the token immediately - you won't be able to see it again!

### Option B: Set Up SSH Keys

If you prefer using SSH:

1. Generate SSH keys:
   ```
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
2. Add the SSH key to your GitHub account:
   ```
   cat ~/.ssh/id_ed25519.pub
   ```
3. Copy the output and add it to [GitHub's SSH Keys page](https://github.com/settings/keys)

## 3. Push Your Code to GitHub

### Using HTTPS with Personal Access Token

1. Add the remote repository:
   ```
   git remote add origin https://github.com/jham323/Vector-Flux.git
   ```
2. Push your code:
   ```
   git push -u origin main
   ```
3. When prompted for your password, use the personal access token you generated

### Using SSH

1. Add the remote repository using SSH:
   ```
   git remote add origin git@github.com:jham323/Vector-Flux.git
   ```
2. Push your code:
   ```
   git push -u origin main
   ```

## 4. Handling Large Files

If you're still having issues with the large audio files:

1. Install Git LFS:
   ```
   brew install git-lfs
   ```
2. Initialize Git LFS:
   ```
   git lfs install
   ```
3. Track large files:
   ```
   git lfs track "*.mp3"
   ```
4. Add the .gitattributes file:
   ```
   git add .gitattributes
   ```
5. Commit the change:
   ```
   git commit -m "Track large files with Git LFS"
   ```
6. Push again:
   ```
   git push -u origin main
   ```

## 5. Alternative: Upload Files Manually

If all else fails, you can upload files manually through the GitHub web interface:

1. Go to your repository on GitHub
2. Click "Add file" > "Upload files"
3. Drag and drop your files or use the file selector
4. Add a commit message
5. Click "Commit changes"

## 6. Setting Up GitHub Pages (Optional)

To make your game playable online:

1. Go to your repository on GitHub
2. Click "Settings" > "Pages"
3. Under "Source", select "main" branch
4. Click "Save"
5. Your game will be available at `https://jham323.github.io/Vector-Flux/`

## 7. Restoring Audio Files

After successfully pushing to GitHub, restore your audio files:

```
cp -r temp_backup/* audio/
rm -rf temp_backup
git add audio/
git commit -m "Add audio files"
git push origin main
```

## Need Help?

If you continue to experience issues, consider:

1. Checking GitHub's status page: https://www.githubstatus.com/
2. Consulting GitHub's documentation: https://docs.github.com/en
3. Asking for help on Stack Overflow with the 'github' tag 