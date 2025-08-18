# Virtual System

## 1 - Abstract

A virtual system is an artificial file system overlaid atop an existing file system or simulated in
the absence of one.

## 2 - Contents

### 2.1 - Conventions

#### 2.1.1 - Paths

A virtual system path (VSP) is a file path to a resource on a real or virtual file system. The
elements of a path are strings which are separated and ordered into a list.

The first element of a VSP is the disk, specifying both the system the resource is located in and
the conventions for retrieving or modifying it. Each disk itself operates as a folder, containing
all resources nested within it. An empty path specifies a folder containing all available disks.

Each subsequent element specifies the name of a subfolder of the folder specified by the previous
element, except in a file path, where the last element specifies the name of a file within the
folder specified by the previous element.

A blank path may be rendered as an empty string. A path to a disk may be rendered as the name
of the disk, followed by the string "://". A path to a non-disk element may be rendered as a string
where the disk name is separated from the next element by the string "://", and each subsequent
element is separated from the next by a single forward slash. Any separating or otherwise
functional characters in element names may be escaped with a backslash.

Local paths may be specified using abridged versions of global paths and periods as in UNIX-style
file path conventions.

VSPs are case insensitive unless there's a conflict between multiple resources.

##### 2.1.1.1 - Standard Disks

##### 2.1.1.1.1 - Ghost Disk

The ghost disk ("Ghost://") is a disk corresponding to the volatile storage of the application
running the virtual system, hence its contents will be erased when the application is terminated.

##### 2.1.1.1.2 - HTTP Disks

HTTP disks are disks representing the HTTP protocols as disks to make URLs into valid VSPs, being
"http://" and "https://" respectively.

##### 2.1.1.1.3 - Local Disks

Local disks are disks representing the actual disks on the local file system, sharing the aliases
of the same ("C://", "D://", etc.).

##### 2.1.1.1.4 - Storage Disk

The storage disk ("Storage://") is a disk corresponding to the non-volatile storage of the
application running the virtual system.

In browsers, it is, by default, stored as a VSF string in window.localStorage under the alias
"virtualSystem".

#### 2.1.2 - Format

##### 2.1.2.1 - Meta JSON

Meta JSON is a JSON object format for assigning properties to JSON content without embedding said
properties into the content itself.

A meta JSON object has two fields, "content", containing a JSON object or list, and "metadata",
containing a list of metadata objects. Metadata objects have two fields, "selector", containing a
key and index path array for selecting values within the aforementioned content, and "properties",
containing a miscellaneous value to associate with the selected values.

##### 2.1.2.2 - Virtual System Format (VSF)

The virtual system format (VSF) is a JSON format used to serialize the structure of a file system
and, to varying degrees, its contents.

A folder may be represented in VSF using an object, where every field represents an entity in the
folder.

A field containing another folder object represents a folder where the key is the folder name and
the value is the folder content.

A field containing a string represents a file where the key is the file name and the value is the
file content.

A field containing an array of numbers represents a file where the key is the file name and the
value is the binary content of the file where each number is the numerical value of the
corresponding byte.

A field containing an array with a string, or list thereof, as its first element, and a boolean as
its second, represents an external file or folder where the first element specifies the VSP, or a
list of potential VSPs in order of priority, to the external resource, and the second argument
specifies whether the external resource in VSF format, with it being true if so and false
otherwise.

Additional metadata may be assigned to files and folders stored or referenced in a VSF object using
meta JSON where the VSF object is the content.

#### 2.1.3 - Overlays

A virtual system overlay (VSO) is a file in a real or virtual file system which references virtual
system content that is to be overlaid atop the folder in which it is located while the virtual
system is active, but, by default, not to actually be written to disk.

VSO content can, however, be written to disk and permanently overlaid atop the folder content if
the action is manually requested. Additionally, virtual system folders may be overlaid atop other
folders manually, permanently or not, without the use of VSOs.

A VSO file shall have the ".vso" extension, and shall contain a VSP to a VSF object containing the
content to be overlaid.

#### 2.1.4 - Hooks

A virtual system hook (VSH) is an event listener which triggers an event when a specific resource
or set of resources within a virtual system is altered.

#### 2.1.5 - Meta Models

Meta models are model which contextualize a disparate set of records and databases by serializing
them within, or referencing them from, a hierarchical structure, such as a file system where said
elements are represented as files.

Virtual systems may be used for this purpose.