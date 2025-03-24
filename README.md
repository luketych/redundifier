The objective of this is to sit in between the client, who is creating cards, and uploading files, and the strapi API. It intercepts POST requests for file upload, and creates duplicates, and returns both the original reponse and the response for the duplicate file back to the requester.

Additionally, this service may handle the short url's and assembling the index and index-index files together and sending back to the requester.
