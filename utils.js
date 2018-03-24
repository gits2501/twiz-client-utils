'use strict'
 
   function percentEncode(str){                                     // percent encode by RFC3986
   
      return encodeURIComponent(str).replace(/[!'()*]/g, function(c){ // percent encodes unsafe chars, then
                                                                     // it follows RFC3986 and percent encodes
                                                                     // reserved characters in sqere brackets.
         return '%' + c.charCodeAt(0).toString(16);   // takes binary representation of every reserved char
                                                      // , coverts it to hex string char and appends to "%".
      });
 
   }

   function formEncode(dataObj, spaces){
       var pairs = [];
       var value;
       var key;
       var type;
        for(var name in dataObj){
            type = typeof dataObj[name];
             if(dataObj.hasOwnProperty(name) && type !== "function" && dataObj[name] !== "null"){ // only props 
                                                                                           // in dataObj 
                  key = percentEncode(name);   // encode property name

                  if(type === 'object'){                         
                     value = formEncode(dataObj[name], spaces); // form encode object
                     value = percentEncode(value)          // since return value is string, percent encode it
                  }                      
                  else value = percentEncode(dataObj[name]) // property is not object, percent encode it
                  
                  if(!spaces){
                     key = key.replace(/%20/g, "+") 
                     value = value.replace(/%20/g, "+"); // substitute space encoding for +
                  }
                 
                  pairs.push(key + "=" + value)                 
             }
        }

      return pairs.join("&");
  } 

  var request = ( function request (){

    var request = {};

    request.messages = {
      cbAlreadyCalled: "Callback function has already been called.",
      cbWasNotCalled: "Calback function provided was not called.",
      urlNotSet: "You must provide url for the request you make.",
      callbackNotProvided: "Callback function was not provided.",
      notJSON: 'Faileg to parse data as JSON',
      encodingNotSupported: "Encoding you provided is not supported",
      noContentType: "Failed to get content-type header from response"
    };

    request.initRequest = function(args){ // Propertie names, in args object, that this function supports are:
                                          //  url, queryParams, callback, httpMethod, body, beforeSend
      this.request = this.createRequest(); // Creates XMLHttpRequest object
      var temp;                           // Temporary place holder
      
      for(var prop in args){           // iterates trough every argument provided
         if(!args.hasOwnProperty(prop)) continue;
         temp = args[prop];         
         switch(prop){
            case "url":
              this.setUrl(temp);        // sets the reqest url
            break;
            case "queryParams":
              this.setQuery(temp);      // Makes query string for url
            break;
            case "callback":
              this.addListener(temp);   // Adds listener for succesful data retrieval and invokes callback
            break;
            case "method":
              this.method = temp.toUpperCase() || "GET" // request method
            break;
            case "body":  console.log("has DATA");
              this.body = temp;          // add body for request
            break;
            case "parse":
              this.parse = temp;
            break; 
            case "encoding":
              this.encoding = temp;
            break;
            case "beforeSend":
              this.beforeSend = temp // For instance, if we need to set additonal request specific headers 
                                     // this.beforeSend is invoked before sending the request, but afther open()
                                     // is called. Here we have created new property.
            break;
         }    
      }
 
      if(!this.url) throw new Error(this.messages.urlNotSet); // Throw error if url was not provided in args
      if(!this.method) this.method = "GET"; // Defaults to "GET" method if one was not provided in args object
      if (!this.request.onreadystatechange) throw new Error(this.messages.callbackNotProvided); // cb missing
      
     // console.log("request Instance:", this, typeof this) 
      console.log(args);
      this.sendRequest();     // Makes the actual http request

    }; 
 
    request.createRequest = function(){
        try{
            return new XMLHttpRequest(); // standard
        }
        catch(e){  console.log(e);
            try{ 
                return new ActiveXObject("Microsoft.XMLHTTP");  // IE specific ...
            }
            catch(e){
                return new ActiveXObject("Msxml12.XMLHTTP");
            }
        }
    }
    request.setUrl = function(url){
      if(!this.url) this.url = url;
      else this.url = url + this.url;  // if setQueryParams() run before set url, we already have query string
                                       //  in "this.url". So "url" needs to go first.
    };

    request.setQuery = function(queryParams){
      this.queryString = formEncode(queryParams);// Function uses form-url-encoded scheme to return query string
      if(this.url.indexOf("?") === -1) this.url+="?"; // if doesnt have query delimiter add it. 
      this.url+= this.queryString; // Adds query string to url 

    };
   
    request.addListener = function(callback) {
      var alreadyCalled = false;

      this.request.onreadystatechange = function(){
          
         if(this.request.readyState === 4){
              if(alreadyCalled){
                  console.log('cbAlreadyCalled');
                  return;
              }
             
              alreadyCalled = true;

              var statusCode = this.request.status; 
              var contentType = this.request.getResponseHeader("Content-type");// Get the response's content type
             
              this.invokeCallback(statusCode, contentType, callback);
              
         }   
      }.bind(this); // Async functions lose -this- context because they start executing when functions that 
                    // invoked them already finished their execution. Here we pass whatever "this" references 
                    // in the moment addListener() is invoked. Meaning, "this" will repesent each 
                    // instance of request, see return function below. 
    };

    request.invokeCallback = function (statusCode, contentType, callback){
       var error; 
       var data;
       var temp;

       if(!contentType) throw new Error(this.messages.noContentType);
       var contentType = contentType.split(';')[0]; // get just type , in case there is charset specified 

       console.log('content-type: ', contentType)
       switch(contentType){              // get request data from apropriate property, parse it if indicated  
           case "application/json":   
              try{ console.log('content-type is application/json')
                 if(this.parse) temp = JSON.parse(this.request.responseText); // parse json data
                 else temp = this.request.responseText;
                 console.log('temp afther JSON parsing: ', temp)
              }
              catch(e){
                  throw new Error(this.messages.notJSON + " \n"+ e); // if parsing failed note it
              }
           break;   
           case "application/xml":
              temp = this.request.responseXML; // responceXML already parsed as a DOM object
           break;
           case "application/x-www-url-formencoded":
              temp =  {};
              this.request.responseText.trim().split("&").forEach(function(el, i){ // split on &
                   
                  var pairs = el.split('=');                  
                  var header = decodeURIComponent(pairs[0]); // decode header name
                  var value  = decodeURIComponent(pairs[1]); // decode value
                  temp[header] = value; // adds to data header name and its value
              }, temp)
           break;
           default:
              temp = this.request.responseText;// text/html , text/css and others are treated as text
       }

       if(statusCode !== 200){             // on error create error object
          error = { 'status': statusCode, 'statusText': this.request.statusText, 'data': temp }
       }
       else data = temp;                   // no error, data is object we got from payload
 
       
       callback(error, data)   // invoke callback

    }

    request.setHeader = function(header, value){     // set the request header 
       this.request.setRequestHeader(header, value);  
    };

    request.setBody = function(){ // sets Content-Type encoding and encode the body of a request
               console.log("In setBody")
        if(this.body){     // check for data payload 
          
          if(!this.encoding){                       // If there is no string that indicates encoding
            this.setHeader("Content-Type", "text/plain"); // default to text, set the content type (was formEnc)
          }
          else {
              switch(this.encoding.toLowerCase()){      // when there is encoding string
                    case "form":
                      this.body = formEncode(this.body) // encode the body
                      this.setHeader("Content-Type", "application/x-www-url-formencoded;charset=utf-8"); 
                    break;
                    case "json":
                      this.body = JSON.stringify(this.body)  
                      this.setHeader("Content-Type", "application/json;charset=utf-8");
                    break;
                    case "text":
                      this.setHeader("Content-Type", 'text/plain;charset=utf-8');
                    break;
                    default:
                      throw new Error(this.messages.encodingNotSupported);
               }
          }
        }
        else { 
           this.body.data = null; // set the body to null
        } 

 
    };
    request.sendRequest = function(){

      if(this.request.readyState == "0") this.request.open(this.method, this.url);// "0" means open() not called
      if(this.beforeSend) this.beforeSend(this.request) // if user supplied beforeSend() func, call it.
        console.log("This before setBody!", "req state:"+ this.request.readyState);
      
      if(this.body) this.setBody();
      else if(this.method === "POST") this.body = null; // set it to 'null' if there is no body and method 
                                                        //is POST. This is just xmlhttp request spec.
      
      if(this.method === "GET") this.request.send(null);
      if(this.method === "POST") this.request.send(this.body); 
       
    };    
   
    return function(args){  // modul returns this function as API

      var r = Object.create(request); // behavior delegation link
     
       if(args){ 
          r.initRequest(args);       // Initialise request and sends it, if args are provided
          return;                    // if not , then return the object that indirectly, through closures 
      }                              // have access to prototype chain of request API. That is it has acess to 
                                     // an instance of request API (here it is "r").
       			
      return phantomHead = { initRequest: r.initRequest.bind(r) } // "borrow" method from instance, bind it to instance
    }

 })(); 

   function CustomError(){
       
       this.messages = {}; // error messages place holder    
   
       
       this.addCustomErrors = function (errors){  // add custom error messages
 
          Object.getOwnPropertyNames(errors).map(function(name){
     
            this.messages[name] = errors[name];
          },this)
       }

       this.CustomError = function(name){// uses built-in Error func to make custom err info

          var err = Error(this.messages[name]);      // take message text
          err['name'] = name;                          // set error name
          return err; 
       }


   }

   module.exports = {
      percentEncode: percentEncode,
      formEncode:    formEncode,
      request:       request,
      CustomError:   CustomError
   }
