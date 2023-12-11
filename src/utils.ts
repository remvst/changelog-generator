import { exec } from "child_process";
import { dirname } from 'path';

export function execShellCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout? stdout : stderr);
        });
    });
}
