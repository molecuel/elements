[![Build Status](https://travis-ci.org/molecuel/mlcl_mailer.svg?branch=master)](https://travis-ci.org/molecuel/mlcl_mailer)

[![NPM](https://nodei.co/npm-dl/mlcl_mailer.png?months=1)](https://nodei.co/npm/mlcl_mailer/)

[![NPM](https://nodei.co/npm/mlcl_mailer.png?downloads=true&stars=true)](https://nodei.co/npm/mlcl_mailer/)

[![NPM version](https://badge.fury.io/js/mlcl_mailer@2x.png)](http://badge.fury.io/js/mlcl_mailer)

# mlcl_mailer
Mailer plugin for molecuel

## Development Installation:
git clone https://github.com/molecuel/mlcl_mailer.git

npm install

typings install

## API
You can register own functions to process a mail response queue.

The registerHandler expects **function(object)**.

The function parameter
*object* will become a stringified response object.
