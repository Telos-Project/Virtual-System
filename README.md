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

##### 2.1.1.1 - The Common Storage Convention

The common storage convention is for shared processes within a program to store shared state in a
common global object, deriving what is referred to as the common state from all fields that are not
present in said object by default.

In the case of a virtual system disk, it shall interpret each field in the common state as a file,
if said field is a primitve value, or as a folder if not.

##### 2.1.1.2 - Standard Disks

###### 2.1.1.2.1 - Ghost Disk

The ghost disk ("Ghost://") is a disk corresponding to the volatile storage of the application
running the virtual system, hence its contents will be erased when the application is terminated.

The ghost disk uses the common storage convention, using the window object in the browser and the
global object in node.

###### 2.1.1.2.2 - HTTP Disks

HTTP disks are disks representing the HTTP protocols as disks to make URLs into valid VSPs, being
"http://" and "https://" respectively.

###### 2.1.1.2.3 - Local Disks

Local disks are disks representing the actual disks on the local file system, sharing the aliases
of the same ("C://", "D://", etc.).

###### 2.1.1.2.4 - Storage Disk

The storage disk ("Storage://") is a disk corresponding to the non-volatile storage of the
application running the virtual system.

The storage disk uses the common storage convention, using the localStorage object in the browser.

#### 2.1.2 - Virtual System Format (VSF)

The virtual system format (VSF) is an [APInt mask](https://github.com/Telos-Project/APInt?tab=readme-ov-file#23---apint-masks)
which allows "folders" to be used in place of "packages", and "files" to be used in place of
"utilities".

VSF is the primary method for serializing virtual systems.

#### 2.1.3 - Overlays

A virtual system overlay (VSO) is a file in a real or virtual file system which references virtual
system content that is to be overlaid atop the folder in which it is located while the virtual
system is active, but, by default, not to actually be written to disk.

VSO content can, however, be written to disk and permanently overlaid atop the folder content if
the action is manually requested. Additionally, virtual system folders may be overlaid atop other
folders manually, permanently or not, without the use of VSOs.

A VSO file shall have the ".vso" extension, and shall either contain a VSP to a VSF object
containing the content to be overlaid, or shall itself contain the content of said VSF object.

#### 2.1.4 - Hooks

A virtual system hook (VSH) is an event listener which triggers an event when a specific resource
or set of resources within a virtual system is altered.