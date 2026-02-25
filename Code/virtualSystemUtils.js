/*

	disk = { alias, setResource(path, content), getResource(path) }
	fileSystem = [disk 1, disk 2, ..., disk n]

	command =

		(path/)alias arg1 "arg 2" "\"arg \\2\""

		Notes

			default path includes "Origin://"
			default command = execute(.js) "code"

	startup = path in fileSystem to JSON file: [command 1, ...]

*/

var virtualSystemUtils = {
	cookieDisk: (cookie) => {

		return {
			"alias": cookie,
			setResource: (path, content) => {

				path = path.trim().endsWith("/") ?
					path.trim().substring(0, path.length - 1) :
					path.trim();

				let data = window.localStorage.getItem(cookie);

				if(data == null)
					data = "{}";

				if(path.trim() == "" && content == null) {

					window.localStorage.setItem(cookie, "{}");

					return;
				}

				data = JSON.parse(data);

				path = path.split("/");

				let current = data;

				for(let i = 0; i < path.length - 1; i++) {
				
					if(current[path[i]] == null)
						current[path[i]] = { };

					current = current[path[i]];
				}

				if(content != null)
					current[path[path.length - 1]] = content;

				else
					delete current[path[path.length - 1]];

				window.localStorage.setItem(cookie, JSON.stringify(data));
			},
			getResource: (path) => {

				path = path.trim().endsWith("/") ?
					path.trim().substring(0, path.length - 1) :
					path.trim();

				let data = window.localStorage.getItem(cookie);

				if(data == null) {

					if(path.trim() == "")
						return [[], []];

					return null;
				}

				data = JSON.parse(data);

				if(path.trim() == "")
					return virtualSystemUtils.getFolder(data);

				path = path.split("/");

				let current = data;

				for(let i = 0; i < path.length - 1; i++) {
				
					if(current[path[i]] == null)
						return null;

					current = current[path[i]];
				}

				let result = current[path[path.length - 1]];

				if(typeof result == "object")
					return virtualSystemUtils.getFolder(result);
				
				return result;
			},
			serialize: () => {

				let data = window.localStorage.getItem(cookie);

				return data != null ? JSON.parse(data) : { };
			}
		};
	},
	dependencies: {
		apint: typeof apintUtils != "undefined" ?
			apintUtils : require("apint"),
		autoCORS: typeof autoCORS != "undefined" ?
			autoCORS : require("telos-autocors")
	},
	executeCommand: (command) => {

		let args = virtualSystemUtils.getCommandArguments(command);

		let folder = args[0].substring(0, args[0].lastIndexOf("/") + 1);
		let item = args[0].substring(args[0].lastIndexOf("/") + 1);

		if(item.indexOf(".") != -1)
			item = item.substring(0, item.lastIndexOf("."));
		
		let data = virtualSystemUtils.fileSystem.getResource(folder);

		for(let i = 0; i < data[1].length; i++) {

			let resource = data[1][i];

			if(resource.indexOf(".") != -1)
				resource = resource.substring(0, resource.lastIndexOf("."));

			if(resource.toLowerCase() == item.toLowerCase()) {

				if(!folder.endsWith("/"))
					folder += "/";
				
				let file = virtualSystemUtils.fileSystem.getResource(
					folder + data[1][i]
				);

				if(file == null || typeof file == "object")
					return;

				if(file.startsWith("#!") && file.indexOf("\n") != -1)
					file = file.substring(file.indexOf("\n"));
			
				return (new Function(file))(...args.slice(1));
			}
		}
	},
	fileSystem: null,
	getAbsolutePath: (path, location, paths) => {

		if(paths != null) {

			paths = [location].concat(paths);

			let result = null;

			for(let i = 0; i < paths.length; i++) {

				let absolute =
					virtualSystemUtils.getAbsolutePath(path, paths[i]);

				if(virtualSystemUtils.getResource(absolute) != null)
					return absolute;

				if(result == null)
					result = absolute;
			}

			return result;
		}

		if(path.includes("://"))
			return path;

		if(path.startsWith("/"))
			path = path.substring(1);

		if(location.endsWith("/"))
			location = location.substring(0, location.length - 1);

		let absolute = location.trim().length > 0 ?
			location.split("://").join("/").split("/") :
			[];

		path = path.split("/");

		path.forEach((directory) => {
			
			if(directory.split(".").join("").trim().length == 0) {

				for(let i = 0; i < directory.length - 1; i++) {

					if(absolute.length > 0)
						absolute.splice(absolute.length - 1, 1);
				}
			}

			else
				absolute.push(directory);
		});

		if(absolute.length == 0)
			return "";

		if(absolute.length == 1)
			return absolute[0];

		absolute[0] += ":/";

		return absolute.join("/");
	},
	getCommandArguments: (command) => {

		let args = [""];
		
		let tokens = command.split(/(\\|\"|\s)/).filter(
			item => item.length > 0
		);

		let inQuote = false;

		for(let i = 0; i < tokens.length; i++) {

			if(tokens[i] == "\"")
				inQuote = !inQuote;

			else if(tokens[i] == "\\") {

				args[args.length - 1] += tokens[i + 1];

				i++;
			}

			else if(tokens[i] == " " && !inQuote)
				args.push("");

			else
				args[args.length - 1] += tokens[i];
		}

		return args;
	},
	getFolder: (data) => {

		let folder = [[], []];
		let keys = Object.keys(data);

		for(let i = 0; i < keys.length; i++) {
			
			if(typeof data[keys[i]] == "object")
				folder[0].push(keys[i]);
		
			else
				folder[1].push(keys[i]);
		}

		return folder;
	},
	getLocalDrives: () => {

		try {

			const platform = require("os").platform();

			if(platform == "win32") {

				let drives = JSON.parse(require("child_process").execSync(
					`powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Select -Expand Root | ConvertTo-Json"`,
					{ encoding: "utf8" }
				));

				return Array.isArray(drives) ? drives : [drives];
			}

			return [...new Set(
				require("child_process").execSync(
					platform == "darwin" ?
						`mount | awk '{print $3}'` :
						`lsblk -ln -o MOUNTPOINT | grep -v '^$'`,
					{ encoding: "utf8" }
				).split("\n").map(s => s.trim()).filter(Boolean)
			)];
		}
		
		catch(error) {
			return [];
		}
	},
	getResource: (path, content) => {

		if(!path.includes("://") &&
			virtualSystemUtils.dependencies.autoCORS.getPlatform() != "browser"
		) {

			path = (
				process.cwd() + require("path").sep + path
			).split(":\\").join("://");
		}

		let result = virtualSystemUtils.fileSystem != null ?
			virtualSystemUtils.fileSystem.getResource(path, content) :
			null;

		if(result == null ? true : Array.isArray(result)) {

			if(virtualSystemUtils.dependencies.autoCORS.getPlatform() !=
				"browser"
			) {

				path = require("path").resolve(path).
					split(":\\").join("://").
					split("\\").join("/");
			}
			
			Object.keys(virtualSystemUtils.overlayCache.items).forEach(key => {

				if(key.toLowerCase().trim() == path.toLowerCase().trim())
					result = virtualSystemUtils.overlayCache.items[key];

				else if(key.toLowerCase().trim().startsWith(
					path.toLowerCase().trim()
				)) {

					result = result != null ? result : [[], []];

					let item = key.substring(path.length);

					while(item.startsWith("/"))
						item = item.substring(1);
					
					result[item.includes("/") ? 0 : 1].push(
						item.includes("/") ?
							item.substring(0, item.indexOf("/")) : item
					);

					result[item.includes("/") ? 0 : 1] =
						[...new Set(result[item.includes("/") ? 0 : 1])];
				}
			});

			if(result != null)
				return result;
		}

		return Array.isArray(result) ?
			result.map(item => item.sort()) : result;
	},
	ghostDisk: () => {

		return {
			"alias": "Ghost",
			cache: { },
			setResource: (path, content) => {
				// STUB
			},
			getResource: (path) => {

				// STUB

				return null;
			},
			serialize: () => {
				return { };
			}
		};
	},
	httpDisk: () => {

		return {
			"alias": "http",
			setResource: (path, content) => {

			},
			getResource: (path) => {

				try {

					return virtualSystemUtils.dependencies.autoCORS.read(
						"http://" + path
					);
				}

				catch(error) {
					return null;
				}
			},
			serialize: () => {
				return { };
			}
		};
	},
	httpsDisk: () => {

		return {
			"alias": "https",
			setResource: (path, content) => {

			},
			getResource: (path) => {

				try {

					return virtualSystemUtils.dependencies.autoCORS.read(
						"https://" + path
					);
				}

				catch(error) {
					return null;
				}
			},
			serialize: () => {
				return { };
			}
		};
	},
	initiateVirtualSystem: (fileSystem, config) => {

		if(virtualSystemUtils.fileSystem != null)
			return;

		virtualSystemUtils.fileSystem = fileSystem;

		virtualSystemUtils.load(config);
	},
	initiateVirtualSystemDefault: (config, cookieName) => {

		try {

			if(virtualSystemUtils.fileSystem != null)
				return;

			let platform =
				virtualSystemUtils.dependencies.autoCORS.getPlatform();
		
			let fileSystem = virtualSystemUtils.virtualFileSystem(
				[
					virtualSystemUtils.ghostDisk(),
					virtualSystemUtils.httpDisk(),
					virtualSystemUtils.httpsDisk()
				].concat(
					platform == "browser" ?
						[virtualSystemUtils.cookieDisk(
							cookieName != null ? cookieName : "Storage"
						)] :
						virtualSystemUtils.getLocalDrives().map(
							item => virtualSystemUtils.localDisk(
								item.includes(":") ?
									item.substring(0, item.indexOf(":")) : item
							)
						)
				)
			);

			if(platform == "browser") {

				fileSystem.setResource(
					"Storage://execute.js", "eval(arguments[0]);"
				);
			}
			
			virtualSystemUtils.initiateVirtualSystem(fileSystem, config);
		}

		catch(error) {

		}
	},
	isBinaryFile: (path, bytesToCheck = 8000) => {

		const buffer = require("fs").readFileSync(path);
		const len = Math.min(buffer.length, bytesToCheck);

		let suspicious = 0;

		for (let i = 0; i < len; i++) {

			const byte = buffer[i];

			if(byte == 0)
				return true;

			if(byte < 7 || (byte > 14 && byte < 32) || byte > 127) {

				suspicious++;
				
				if(suspicious / len > 0.3)
					return true;
			}
		}

		return false;
	},
	load: (config) => {

		if(config == null)
			return;

		try {

			let data = { };
			
			if(typeof config == "object")
				data = config;
				
			else {

				try {
					data = JSON.parse(config);
				}

				catch(error) {

					data = JSON.parse(
						virtualSystemUtils.dependencies.autoCORS.read(config)
					);
				}
			}

			if(typeof data.files == "object")
				virtualSystemUtils.loadFiles(data.files);

			if(Array.isArray(data.commands))
				virtualSystemUtils.loadCommands(data.commands);
		}

		catch(error) {

		}
	},
	loadCommands: (commands) => {
		
		commands.forEach((item) => {
			virtualSystemUtils.executeCommand(item);
		});
	},
	loadFiles: (files, path) => {
		
		if(Array.isArray(files)) {
			
			files.forEach((item) => {

				virtualSystemUtils.setResource(
					item.path,
					item.location != null ?
						virtualSystemUtils.dependencies.autoCORS.read(
							"" + item.location
						) :
						"" + item.content
				);
			});
		}

		else {

			path = path != null ? path : "";

			Object.keys(files).forEach((key) => {
				
				let value = files[key];

				if(typeof value == "object") {

					let newPath = path + key + (
						path.length == 0 ? "://" : "/"
					);

					virtualSystemUtils.loadFiles(value, newPath);
				}

				else {

					try {
						virtualSystemUtils.setResource(path + key, "" + value);
					}

					catch(error) {

					}
				}
			});
		}
	},
	localDisk: (disk) => {

		return {
			"alias": disk,
			setResource: (path, content) => {

				path = disk + "://" + path;

				try {
					
					if(content == null) {

						if(require("fs").existsSync(path))
							require("fs").rmSync(path);
					}

					else {

						try {

							require("fs").writeFileSync(
								path,
								typeof content == "string" ?
									content :
									new Uint8Array(
										Buffer.from(content)
									)
							);
						}

						catch(error) {

							path = require("path").resolve(path).
								split(":\\").join("://").
								split("\\").join("/");

							virtualSystemUtils.overlayCache.items[path] =
								content;

							if(path.toLowerCase().endsWith(".vso"))
								virtualSystemUtils.overlay(directory, content);
						}
					}
				}

				catch(error) {
					console.log(error)
				}
			},
			getResource: (path) => {

				let sections = path.split(/\/|\\/).filter(
					item => item.trim().length > 0
				);

				for(let i = 0; i < sections.length; i++) {

					virtualSystemUtils.localDiskOverlay(
						disk + "://" + sections.slice(0, i + 1).join("/")
					);
				}

				path = disk + "://" + path;

				try {

					if(!require("fs").existsSync(path))
						return null;

					if(require("fs").lstatSync(path).isDirectory()) {

						let folder = [[], []];

						require("fs").readdirSync(
							path, { withFileTypes: true }
						).forEach(item => {
							folder[item.isDirectory() ? 0 : 1].push(item.name);
						});

						return folder;
					}

					return require("fs").readFileSync(
						path,
						virtualSystemUtils.isBinaryFile(path) ? null : "utf-8"
					);
				}

				catch(error) {
					console.log(error);
				}
				
				return null;
			},
			serialize: () => {

				// STUB

				return { };
			}
		};
	},
	localDiskOverlay: (path) => {

		try {

			let directory = require("path").resolve(path);

			let parent = directory.substring(
				0, directory.lastIndexOf(require("path").sep)
			);

			if(require("fs").existsSync(directory)) {

				if(!require("fs").lstatSync(directory).isDirectory())
					directory = parent;
			}

			else
				directory = parent;

			require("fs").readdirSync(
				directory, { withFileTypes: true }
			).filter(
				item =>
					!item.isDirectory() &&
						item.name.toLowerCase().endsWith(".vso")
			).map(item => require("path").resolve(
				directory + require("path").sep + item.name
			)).forEach(item => {

				let vsoPath = item.
					split(":\\").join("://").
					split("\\").join("/");

				if(virtualSystemUtils.overlayCache.VSO.includes(vsoPath))
					return;

				virtualSystemUtils.overlayCache.VSO.push(vsoPath);

				virtualSystemUtils.overlay(
					directory.split(":\\").join("://").split("\\").join("/"),
					require("fs").readFileSync(item, "utf-8")
				);
			});
		}

		catch(error) {

		}
	},
	overlayCache: {
		items: {
			/*
				item: [2, 1, ...] / "content"
			*/
		},
		VSO: []
	},
	overlay: (directory, vso, path) => {

		if(path == null) {

			try {
				
				try {
					vso = JSON.parse(vso);
				}

				catch(error) {

					vso = JSON.parse(
						virtualSystemUtils.dependencies.autoCORS.read(vso)
					);
				}

				virtualSystemUtils.overlay(
					directory,
					virtualSystemUtils.dependencies.apint.buildAPInt(
						vso,
						{
							packages: ["folders"],
							utilities: ["files"]
						}
					),
					[]
				);
			}

			catch(error) {
				console.log(error);
			}

			return;
		}

		Object.keys(
			vso.utilities != null ? vso.utilities : []
		).forEach(key => {

			let value = vso.utilities[key];

			key = directory + (
				"/" + path.join("/") + "/" + key
			).split("//").join("/");

			if(value.content != null)
				virtualSystemUtils.overlayCache.items[key] = value.content;

			else if(value.source != null) {
				
				virtualSystemUtils.overlayCache.items[key] =
					virtualSystemUtils.dependencies.autoCORS.read(
						Array.isArray(value.source) ?
							value.source[0] : value.source
					);
			}
		});

		Object.keys(vso.packages != null ? vso.packages : []).forEach(key => {
			
			virtualSystemUtils.overlay(
				directory,
				vso.packages[key],
				path.concat([key])
			);
		});
	},
	virtualFileSystem: (disks) => {

		return {
			"disks": disks,
			"executeCommand": virtualSystemUtils.executeCommand,
			setResource: (path, content) => {

				if(path.trim() == "" && content == null) {

					for(let i = 0; i < disks.length; i++)
						disks[i].setResource(path, content);
				}

				let alias = path.substring(0, path.indexOf(":"));
				path = path.substring(path.indexOf(":") + 3);

				for(let i = 0; i < disks.length; i++) {

					if(disks[i].alias.toLowerCase() == alias.toLowerCase()) {

						disks[i].setResource(path, content);

						break;
					}
				}
			},
			getResource: (path) => {

				if(path.trim() == "") {
					
					let aliases = [];

					for(let i = 0; i < disks.length; i++) {

						aliases.push(
							disks[i].alias
						);
					}

					return [aliases, []];
				}

				let alias = "";

				if(path.indexOf(":") != -1) {
					alias = path.substring(0, path.indexOf(":"));
					path = path.substring(path.indexOf(":") + 3);
				}

				else {
					alias = path;
					path = "";
				}

				for(let i = 0; i < disks.length; i++) {

					if(disks[i].alias.toLowerCase() == alias.toLowerCase())
						return disks[i].getResource(path);
				}
			},
			serialize: () => {

				// STUB
				
				let data = { };

				disks.forEach((item) => {
					data[item.alias] = item.serialize();
				});

				return JSON.stringify(data);
			}
		};
	},
	serialize: () => {
		return virtualSystemUtils.fileSystem != null ?
			fileSystem.serialize() : "";
	},
	setResource: (path, content) => {

		if(!path.includes("://") &&
			virtualSystemUtils.dependencies.autoCORS.getPlatform() != "browser"
		) {

			path = (
				process.cwd() + require("path").sep + path
			).split(":\\").join("://");
		}

		if(virtualSystemUtils.fileSystem != null)
			virtualSystemUtils.fileSystem.setResource(path, content);
	}
};

if(typeof module == "object")
	module.exports = virtualSystemUtils;

try {

	if(require.main === module) {
		// STUB - Permanent VSO Overlay / Save VSO
	}
}

catch(error) {
	console.log(error);
}