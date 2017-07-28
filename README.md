# @molecuel/elements [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage percentage][coveralls-image]][coveralls-url]

elements module for the Molecuel framework. Creating and configuring data models and validation for the database persistence layer. New database connections (documentdb + elasticsearch) are in progress. They will be implemented as adapters and it will be possible to save to different databases with one save method and define the population level of the data in a special population level to denormalize the data for aggregation and optimized reading.

## Initialization

To start it, simply import and instantiate it. If you want to make use of molecuel's offered databases (e.g. @molecuel/mongodb), include them in @molecuel/di's bootstrap. Necessary configurations are read on instantiation via @molecuel/core's config functionality or manually via @molecuel/database's methods. Finally initialize the instance.
Examples:

### Instantiation
```typescript
import { MlclElements } from  "@molecuel/elements";

const elements = new MlclElements();
```
OR
```typescript
import { di } from "@molecuel/di";
import { MlclElements } from  "@molecuel/elements";

const elements = di.getInstance("MlclElements");
```

### Configuration
Configuration settings are imported via separate files and a reference path (e.g.: ./config/production.json)
```json
{
    "databases": [
        {
            "layer": "persistence",
            "name": "mongodb_pers",
            "type": "MlclMongoDb",
            "uri": "mongodb://localhost/mongodb_persistence"
        },
        {
            "layer": "population",
            "name": "mongodb_popul",
            "type": "MlclMongoDb",
            "url": "mongodb://localhost/mongodb_population"
        }
    ]
}
```
```typescript
process.env.configpath = "./config/";
import { di } from "@molecuel/di";
import { MlclElements } from  "@molecuel/elements";
import { MlclMongoDb } from "@molecuel/mongodb";

di.bootstrap(MlclMongoDb);

const elements = di.getInstance("MlclElements");
```
or via objects and a manual method call
```typescript
import { di } from "@molecuel/di";
import { MlclElements } from  "@molecuel/elements";
import { MlclMongoDb } from "@molecuel/mongodb";

const config = {
    databases: [
        {
            layer: "persistence",
            name: "mongodb_pers",
            type: "MlclMongoDb",
            uri: "mongodb://localhost/mongodb_persistence"
        },
        {
            layer: "population",
            name: "mongodb_popul",
            type: "MlclMongoDb",
            url: "mongodb://localhost/mongodb_population"
        }
    ]
};

di.bootstrap(MlclMongoDb);

const elements = di.getInstance("MlclElements");
elements.dbHandler.addDatabasesFrom(config);
```

### Initialization
```typescript
import { di, injectable } from "@molecuel/di";
import { MlclElements } from  "@molecuel/elements";

const elements = di.getInstance("MlclElements");
const success = await elements.init();
```

## Usage
### Example
```typescript
process.env.configpath = "./config/";
import { di, injectable } from "@molecuel/di";
import {
  Collection,
  Element,
  IsDefined,
  MlclElements,
  NotForPopulation } from  "@molecuel/elements";
import * as D from "@molecuel/elements";
import { MlclMongoDb } from "@molecuel/mongodb";

di.bootstrap(MlclMongoDb);
const elements = di.getInstance("MlclElements");
await elements.init();

@injectable
@Collection("post")
@NotForPopulation()
class Message extends Element {
  @IsDefined()
  @D.ValidateType([String])
  public recipients: string[];
  @D.ValidateType()
  public sender: string;
  @D.ValidateType()
  public content: string;
  constructor(recipients: string[], sender: string, content: string) {
    super(elements);
    this.recipients = recipients;
    this.sender = sender;
    this.content = content;
  }
}

let exampleMessage = elements.getInstance("Message", ["you"], "me", "Text snippet.");
await exampleMessage.save();

await elements.find(exampleMessage._id, Message.collection);
```

## Build System

We are using npm to build the entire module.
During development we use the tsc compiler defined in the task.json for visual studio code cause the incremental compilation is very fast. To start the build and watch process in Visual Studio Code just press CTRL+SHIFT+B. The build console should come up and show you the results of the build process.
Any other editor can be used or just use tsc -w -p . on the commandline.

All available npm options:

### npm run tslint
Executes the linter for the typescript files in the src folder

### npm run tslint_test
Executes the linter for the typescript files in the test folder

### npm run ts
Runs the Typescript compiler for all files in the src directory

### npm run ts_test
Runs the Typescript compiler for all files in the test directory

### npm run build
Executes thes linter for the files in the src folder and runs the typescript compiler for the files in the src folder.

### npm run build_test
Executes thes linter for the files in the test folder and runs the typescript compiler for the files in the test folder.

### npm run build_all
Executes thes linter for the files in the src and test folder and runs the typescript compiler for the files in the src and test folder.

### npm run mocha
Just executes the local mocha command which relies in the local node_modules directory.

### npm run test
Executes the compilation of the test files and runs the mocha test.

### npm run cover
Runs the istanbuld code coverage test and remaps the results to the typescript sources

### npm run remap
Remaps the code coverage report to typescript

### npm run remaphtml
Remaps the html output of istanbul to the typescript sources

### npm run remaplcov
Remaps the lcov reports to the typescript sources

### npm run coveralls
Runs the code coverage reports, the remaps and send the results to the coveralls.io service

### npm run createdoc
Creates the HTML for the API documentation in the docs folder. The docs folder is in .gitignore and not part of the master branch. 

### npm run publishdocs
Publishes the API documentation to the gh-pages branch.

### npm run docs
Shortcut for createdocs and publishdocs

### npm run 2npm
Checks it the package version in package.json is higher than the registered one in npm registry and published the package if the version is higher.


[npm-image]: https://badge.fury.io/js/%40molecuel%2Felements.svg
[npm-url]: https://npmjs.org/package/@molecuel/elements
[travis-image]: https://travis-ci.org/molecuel/elements.svg?branch=master
[travis-url]: https://travis-ci.org/molecuel/elements
[daviddm-image]: https://david-dm.org/molecuel/elements.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/molecuel/elements
[coveralls-image]: https://coveralls.io/repos/molecuel/elements/badge.svg
[coveralls-url]: https://coveralls.io/r/molecuel/elements
