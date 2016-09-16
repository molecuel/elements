# Introduction

The new version of molecuel elements is based on Decorators and Typescript. Based on classed it creates a Database abstraction model which uses mongodb as persistence layer and elasticsearch as aggregation layer. The type of a class attribute is autodetected if any decorator has been defined for the attribute.

Elements handles the class definition and validation before the data will be saved to mongodb and elasticsearch. The population and de-population of data is done on class level. Object can be defined as first-class objects (creates new collection or index) or can be defined as subobjects of a first-class object.

## Save flow
If a documents save function will be called elements checks the typings and possible options and saves the document to monogdb. If the document has been saved succesfully the document will populated ( if there are attibutes which needs to be populated) and saved to elasticsearch.

## Queue
If molecuel queue is available a queue for every first-class object will be created. The queues can be used to reindex complete collections of elements.

## Connections
The currenct state of the connections to mongodb and elasticsearch can be monitored and are available over the connetions attribute of the elements instance. The system will try to reconnect to the database as soon as a connection error occurs. If any connection will be dropped the save function of the object will fail. The logging module will be downgraded to console logging while the elasticsearch connection is not available. The state of the system can be made available via API on a frontend server. The system prevents from connection floods with a reconnect timeout and retries to connect forever.

## API definition output
Elements is able to create a JSON based output of the definitions of the element including validator options and  specialized form decorators. This API can be used to create forms and handle data in a possible frontend. For example the molecuel CMS management frontend.
