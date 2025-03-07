// Copyright 2017-2022 Parity Technologies (UK) Ltd.
// This file is part of Substrate API Sidecar.
//
// Substrate API Sidecar is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { spawn } from 'child_process';

import { IProcOpts, ProcsType, StatusCode } from './types';

/**
 * Sets the url that sidecar will use in the env
 *
 * @param url ws url used in sidecar
 */
export const setWsUrl = (url: string): void => {
	process.env.SAS_SUBSTRATE_URL = url;
};

/**
 * Sets the log level for sidecar
 *
 * @param level log-levels -> error, warn, info, http, verbose, debug, silly
 */
export const setLogLevel = (level: string): void => {
	process.env.SAS_LOG_LEVEL = level;
};

/**
 * Kill all processes
 *
 * @param procs
 */
export const killAll = (procs: ProcsType): void => {
	console.log('Killing all processes...');
	for (const key of Object.keys(procs)) {
		if (!procs[key].killed) {
			try {
				console.log(`Killing ${key}`);
				// Kill child and all its descendants.
				process.kill(-procs[key].pid, 'SIGTERM');
				process.kill(-procs[key].pid, 'SIGKILL');
			} catch (e) {
				/**
				 * The error we are catching here silently, is when `-procs[key].pid` takes
				 * the range of all pid's inside of the subprocess group created with
				 * `spawn`, and one of the process's is either already closed or doesn't exist anymore.
				 *
				 * ex: `Error: kill ESRCH`
				 *
				 * This is a very specific use case of an empty catch block and is used
				 * outside of the scope of the API therefore justifiable, and should be used cautiously
				 * elsewhere.
				 */
			}
		}
	}
};

/**
 * Launch any given process. It accepts an options object.
 *
 * @param cmd Optional Command will default to 'yarn'
 * @param procs Object of saved processes
 * @param IProcOpts
 * {
 *   proc => the name of the process to be saved in our cache
 *   resolver => If the stdout contains the resolver it will resolve the process
 *   resolverStartupErr => If the stderr contains the resolver it will resolve the process
 *   args => an array of args to be attached to the `yarn` command.
 * }
 */
export const launchProcess = (
	cmd: string,
	procs: ProcsType,
	{ proc, resolver, resolverJestErr, resolverStartupErr, args }: IProcOpts
): Promise<StatusCode> => {
	return new Promise<StatusCode>((resolve, reject) => {
		const { Success, Failed } = StatusCode;
		const command = cmd || 'yarn';
		let jestStatus = Success;

		procs[proc] = spawn(command, args, { detached: true });

		procs[proc].stdout.on('data', (data: Buffer) => {
			console.log(data.toString().trim());

			if (data.toString().includes(resolver)) {
				resolve(Success);
			}
		});

		procs[proc].stderr.on('data', (data: Buffer) => {
			console.error(data.toString().trim());

			if (resolverJestErr && data.toString().trim().includes(resolverJestErr)) {
				jestStatus = Failed;
			}

			if (resolverStartupErr && data.toString().trim().includes(resolverStartupErr)) {
				resolve(Failed);
			}
		});

		procs[proc].on('close', () => {
			if (jestStatus === Failed) resolve(Failed);
			resolve(Success);
		});

		procs[proc].on('error', (err) => {
			console.log(err);
			reject(Failed);
		});
	});
};
