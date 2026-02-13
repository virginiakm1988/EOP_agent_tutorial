# Push this repo to GitHub

The repository is initialized with an initial commit on branch `main`. To push to GitHub:

1. **Create a new repository** on [GitHub](https://github.com/new) (e.g. name: `ECM-Agent-tutorial`). Do **not** initialize it with a README, .gitignore, or license.

2. **Add the remote and push** (replace `YOUR_USERNAME` with your GitHub username or org):

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/ECM-Agent-tutorial.git
   git push -u origin main
   ```

   Or with SSH:

   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/ECM-Agent-tutorial.git
   git push -u origin main
   ```

After the first push, use `git push` for future updates.
