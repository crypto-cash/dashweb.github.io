# dashWeb - api provider

Every request to this api data provider is cached in a mongoDb to limited external api calls.
When already updating a source new call will be bounced to prevent multiple external api calls.

## Added a new external API source ##

### 1) Add source in readData.js: init function ###
sources collection:
Every data source must have
* name
* ulr
* refreshEveryMinutes

### 2) Add mongo schema in /app/models ###
Add al needed fields

### 3) Add new file in /app/data to read & save(also parse) new source ###
Mandatory functions: readDb & save
