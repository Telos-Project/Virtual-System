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

		Object.assign(this, {
			"alias": cookie,
			setResource: function(path, content) {

				path = path.trim().endsWith("/") ?
					path.trim().substring(0, path.length - 1) :
					path.trim();

				let data = window.localStorage.getItem(this.alias);

				if(data == null)
					data = "{}";

				if(path.trim() == "" && content == null) {

					window.localStorage.setItem(this.alias, "{}");

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

				window.localStorage.setItem(this.alias, JSON.stringify(data));
			},
			getResource: function(path) {

				path = path.trim().endsWith("/") ?
					path.trim().substring(0, path.length - 1) :
					path.trim();

				let data = window.localStorage.getItem(this.alias);

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
			serialize: function() {

				let data = window.localStorage.getItem(this.alias);

				return data != null ? JSON.parse(data) : { };
			}
		});
	},
	executeCommand: (command) => {

		let args = virtualSystemUtils.getCommandArguments(command);

		let folder = args[0].substring(0, args[0].lastIndexOf("/") + 1);
		let item = args[0].substring(args[0].lastIndexOf("/") + 1);

		if(item.indexOf(".") != -1)
			item = item.substring(0, item.lastIndexOf("."));
		
		let data = window.fileSystem.getResource(folder);

		for(let i = 0; i < data[1].length; i++) {

			let resource = data[1][i];

			if(resource.indexOf(".") != -1)
				resource = resource.substring(0, resource.lastIndexOf("."));

			if(resource.toLowerCase() == item.toLowerCase()) {

				if(!folder.endsWith("/"))
					folder += "/";
				
				let file = window.fileSystem.getResource(folder + data[1][i]);

				if(file == null || typeof file == "object")
					return;

				if(file.startsWith("#!") && file.indexOf("\n") != -1)
					file = file.substring(file.indexOf("\n"));
			
				return (new Function(file))(...args.slice(1));
			}
		}
	},
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
	getResource: (path, content) => {

		let result = window.fileSystem != null ?
			window.fileSystem.getResource(path, content) :
			null;

		return Array.isArray(result) ?
			result.map(item => item.sort()) : result;
	},
	httpDisk: () => {

		Object.assign(this, {
			"alias": "http",
			setResource: function(path, content) {

			},
			getResource: function(path) {

				try {
					return virtualSystemUtils.open("http://" + path);
				}

				catch(error) {
					return null;
				}
			},
			serialize: function() {
				return { };
			}
		});
	},
	httpsDisk: () => {

		Object.assign(this, {
			"alias": "https",
			setResource: function(path, content) {

			},
			getResource: function(path) {

				try {
					return virtualSystemUtils.open("https://" + path);
				}

				catch(error) {
					return null;
				}
			},
			serialize: function() {
				return { };
			}
		});
	},
	initiateVirtualSystem: (fileSystem, config) => {

		if(window.fileSystem != null)
			return;

		window.fileSystem = fileSystem;

		virtualSystemUtils.load(config);
	},
	initiateVirtualSystemDefault: (config, cookieName) => {

		try {

			if(window.fileSystem != null)
				return;
		
			cookieName = cookieName != null ? cookieName : "Storage";
		
			let fileSystem = new virtualSystemUtils.virtualFileSystem(
				[
					new virtualSystemUtils.cookieDisk(cookieName),
					new virtualSystemUtils.httpDisk(),
					new virtualSystemUtils.httpsDisk()
				]
			);
		
			fileSystem.setResource(
				"Storage://execute.js", "eval(arguments[0]);"
			);
			
			virtualSystemUtils.initiateVirtualSystem(fileSystem, config);
		}

		catch(error) {

		}
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
					data = JSON.parse(virtualSystemUtils.open(config));
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
						virtualSystemUtils.open("" + item.location) :
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
	open: (path, callback) => {

		let xhr = new XMLHttpRequest();
		xhr.open("GET", path, callback != null);

		let text = "";

		xhr.onreadystatechange = function() {

			if(xhr.readyState === 4) {

				if(xhr.status === 200 || xhr.status == 0) {

					text = xhr.responseText;

					if(callback != null)
						callback(text);
				}
			}
		}

		xhr.send(null);

		return text;
	},
	virtualFileSystem: (disks) => {

		Object.assign(this, {
			"disks": disks,
			"executeCommand": virtualSystemUtils.executeCommand,
			setResource: function(path, content) {

				if(path.trim() == "" && content == null) {

					for(let i = 0; i < this.disks.length; i++)
						disks[i].setResource(path, content);
				}

				let alias = path.substring(0, path.indexOf(":"));
				path = path.substring(path.indexOf(":") + 3);

				for(let i = 0; i < this.disks.length; i++) {

					if(disks[i].alias.toLowerCase() == alias.toLowerCase()) {

						disks[i].setResource(path, content);

						break;
					}
				}
			},
			getResource: function(path) {

				if(path.trim() == "") {
					
					let aliases = [];

					for(let i = 0; i < this.disks.length; i++)
						aliases.push(this.disks[i].alias);

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

				for(let i = 0; i < this.disks.length; i++) {

					if(disks[i].alias.toLowerCase() == alias.toLowerCase())
						return disks[i].getResource(path);
				}
			},
			serialize: function() {
				
				let data = { };

				disks.forEach((item) => {
					data[item.alias] = item.serialize();
				});

				return JSON.stringify(data);
			}
		});
	},
	serialize: () => {
		return window.fileSystem != null ? fileSystem.serialize() : "";
	},
	setResource: (path, content) => {

		if(window.fileSystem != null)
			window.fileSystem.setResource(path, content);
	}
};

if(typeof module == "object")
	module.exports = virtualSystemUtils;