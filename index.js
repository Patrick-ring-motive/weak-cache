// nodejs
var execSync = require('child_process').execSync;


 try {
    const cmd = 'git add --all';
    execSync(cmd).toString();
 } catch (error) {
    error.status;  // 0 : successful exit, but here in exception it has to be greater than 0
    error.message; // Holds the message you typically want.
    error.stderr;  // Holds the stderr output. Use `.toString()`.
    error.stdout;  // Holds the stdout output. Use `.toString()`.
 }
