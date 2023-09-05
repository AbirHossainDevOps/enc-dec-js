const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function encryption(inputFilepath, password) {
    const inputArray = inputFilepath.split('/');
    const filename = inputArray.pop();
    const directoryPath = 'encDirectory/' + inputArray.join('/');
    const outputFilePath = directoryPath + `/${filename}.enc`;

    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
    
    const read = fs.readFileSync(inputFilepath);
    
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const encryptedData = Buffer.concat([cipher.update(read), cipher.final()]);

    const outputData = Buffer.concat([salt, iv, encryptedData]);

    fs.writeFileSync(outputFilePath, outputData);

    console.log(`File encrypted and saved to ${outputFilePath}`);
}

function encryptFilesInDirectory(directoryPath, password) {
    const files = fs.readdirSync(directoryPath);

    files.forEach((fileName) => {
        const filePath = `${directoryPath}/${fileName}`;
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
            encryption(filePath, password); // Encrypt individual file
        } else if (stats.isDirectory()) {
            encryptFilesInDirectory(filePath, password); // Recursively process subdirectories
        }
    });
}

encryptFilesInDirectory('dir', 'pass');

function decryptFile(encryptedFilePath, password, relativeDirectory) {
  const inputArray = encryptedFilePath.split('/');
  inputArray.pop(); // Remove the filename from the path
  const directoryPath = 'decDirectory/' + relativeDirectory + '/' + inputArray.join('/'); // Include relativeDirectory
  const outputFilePath = directoryPath + `/${path.basename(encryptedFilePath, '.enc')}.dec`;

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true }); // Create nested directories if needed
  }

  // Read the encrypted file
  const encryptedData = fs.readFileSync(encryptedFilePath);

  // Extract the salt and IV from the encrypted data
  const salt = encryptedData.slice(0, 16);
  const iv = encryptedData.slice(16, 32);
  const encryptedContent = encryptedData.slice(32);

  // Derive the key using PBKDF2
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');

  // Create a decipher object
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  // Decrypt the data
  const decryptedData = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

  // Write the decrypted data to the output file
  fs.writeFileSync(outputFilePath, decryptedData);

  console.log(`File decrypted and saved to ${outputFilePath}`);
}

function decryptFilesInDirectory(directoryPath, password, relativeDirectory = '') {
  fs.readdirSync(directoryPath).forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && filePath.endsWith('.enc')) {
      decryptFile(filePath, password, relativeDirectory); // Pass relativeDirectory to keep structure
    } else if (stats.isDirectory()) {
      const subDirectory = path.join(relativeDirectory, fileName);
      decryptFilesInDirectory(filePath, password, subDirectory); // Recursively process subdirectories
    }
  });
}

decryptFilesInDirectory('encDirectory/', 'pass');