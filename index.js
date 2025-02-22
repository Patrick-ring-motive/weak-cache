// nodejs
var execSync = require('child_process').execSync;


 try {
    let cmd = 'git add --all';
    execSync(cmd).toString();
    cmd = 'git commit -m "_"';
   execSync(cmd).toString();
    cmd = 'git push origin main';
   execSync(cmd).toString();
 } catch (error) {
    error.status;  // 0 : successful exit, but here in exception it has to be greater than 0
    error.message; // Holds the message you typically want.
    error.stderr;  // Holds the stderr output. Use `.toString()`.
    error.stdout;  // Holds the stdout output. Use `.toString()`.
 }
