import { promises as fs } from 'fs';
import moment from 'moment';
import { execShellCommand } from './utils';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const SPLITTER = 'yolobrolo';

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .options({
            'outDir': { 
                type: 'string', 
                default: '.', 
                alias: 'o', 
                describe: 'Directory to generate the files into',
            },
            'packageJson': { 
                type: 'string', 
                default: './package.json', 
                alias: 'p', 
                describe: 'package.json file to use for the version',
            }
        })
        .argv

    const generatedTs = argv.outDir + '/changelog.ts';
    const generatedJson = argv.outDir + '/changelog.json';

    try {
        await fs.rm(generatedTs, { 'recursive': true });
    } catch (e) {}

    const logs = await execShellCommand(`git log --date=iso-strict --format='%cd${SPLITTER}%s${SPLITTER}%h' | head -n 100`);
    const parsedLogs = logs.trim().split('\n').map((logLine) => {
        const [dateStr, message, commitHash] = logLine
            .replace(/^\'/, '')
            .replace(/\'$/, '')
            .split(SPLITTER);
        const dateString = moment(dateStr).format('YYYY-MM-DD');
        return {
            dateString,
            message,
            commitHash,
        };
    }).filter((log) => log.message.indexOf('Merge branch') === -1);

    const displayableLogs = [];
    for (const log of parsedLogs) {
        if (displayableLogs.length > 50 && log.dateString !== displayableLogs[displayableLogs.length - 1].dateString) {
            break;
        } else {
            displayableLogs.push(log);
        }
    }

    const packageJson = JSON.parse(await fs.readFile(argv.packageJson, 'utf8'));

    let generatedFileContent = '';
    generatedFileContent += 'import VERSION_JSON from "./changelog.json";\n\n';
    generatedFileContent += 'export interface ChangelogItem {\n'
    generatedFileContent += '    dateString: string,\n'
    generatedFileContent += '    message: string,\n'
    generatedFileContent += '    commitHash: string,\n'
    generatedFileContent += '}\n\n';
    generatedFileContent += 'export interface ChangelogJson {\n'
    generatedFileContent += '    current: ChangelogItem & { version: string, },\n'
    generatedFileContent += '    changelog: ChangelogItem[],\n'
    generatedFileContent += '}\n\n';
    generatedFileContent += `export const VERSION = VERSION_JSON.current.version;\n`;
    generatedFileContent += `export const CHANGELOG: ChangelogItem[] = VERSION_JSON.changelog;\n`;
    generatedFileContent += `export const CHANGELOG_JSON: ChangelogJson = VERSION_JSON;\n`;

    await fs.writeFile(generatedTs, generatedFileContent);

    const versionFileContent = {
        'current': {
            ...displayableLogs[0],
            'version': packageJson.version,
        },
        'changelog': displayableLogs,
    };
    await fs.writeFile(generatedJson, JSON.stringify(versionFileContent));
}

main();
