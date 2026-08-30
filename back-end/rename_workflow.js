const fs = require('fs');
const path = require('path');

const folders = ['process-templates', 'process-instances', 'process-instance-steps'];
const basePath = path.join(__dirname, 'src', 'modules');

folders.forEach(folder => {
  const folderPath = path.join(basePath, folder);
  if (!fs.existsSync(folderPath)) return;

  const files = fs.readdirSync(folderPath);
  files.forEach(file => {
    // Check if it's a file
    const filePath = path.join(folderPath, file);
    if (!fs.statSync(filePath).isFile()) return;

    // Read content and replace
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Workflow/g, 'Process');
    content = content.replace(/workflow/g, 'process');
    fs.writeFileSync(filePath, content);

    // Rename file if it contains 'workflow'
    if (file.includes('workflow')) {
      const newFileName = file.replace(/workflow/g, 'process');
      fs.renameSync(filePath, path.join(folderPath, newFileName));
    }
  });

  // Also check dto folders if they exist
  const dtoPath = path.join(folderPath, 'dto');
  if (fs.existsSync(dtoPath)) {
    const dtoFiles = fs.readdirSync(dtoPath);
    dtoFiles.forEach(file => {
      const filePath = path.join(dtoPath, file);
      if (!fs.statSync(filePath).isFile()) return;

      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/Workflow/g, 'Process');
      content = content.replace(/workflow/g, 'process');
      fs.writeFileSync(filePath, content);

      if (file.includes('workflow')) {
        const newFileName = file.replace(/workflow/g, 'process');
        fs.renameSync(filePath, path.join(dtoPath, newFileName));
      }
    });
  }
});

console.log('Renaming and replacing for process modules completed.');
