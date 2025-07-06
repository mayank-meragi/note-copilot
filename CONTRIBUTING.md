# Contributing to Obsidian Tangent Copilot

We welcome contributions to Tangent Copilot. This document will guide you through the process of contributing to the project.

## Development Workflow

1. Clone the repository to your Obsidian vault's plugins directory:

   ```
   git clone https://github.com/infiolab/infio-copilot.git /path/to/your/vault/.obsidian/plugins/infio-copilot
   ```

2. Navigate to the plugin directory:

   ```
   cd /path/to/your/vault/.obsidian/plugins/infio-copilot
   ```

3. Run the following commands to install dependencies and start the development server:

   ```
   pnpm install
   pnpm run dev
   ```

4. Start making changes to the plugin code. To test your changes:

   - Reload Obsidian manually, or
   - Use the [Hot Reload plugin](https://github.com/pjeby/hot-reload) for automatic reloading during development

