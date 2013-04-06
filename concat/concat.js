var http = require('http'),
	url = require('url'),
	events = require('events'),
	file = require('fs');

var concat_content = [], index = 0, total = 0;
var _emitter = new events.EventEmitter();

// read file from local
function readLocalFile(path, filename, idx){
	var _c = file.readFile(path + filename, 'utf8', function (err, data){
		if (err) {
			_emitter.emit('concat_end', 'read file “' + filename + '" failed! ');		//TODO response 404 to client
		} else {
			concat_content[idx] = data;
			if (index++ == total - 1){
				_emitter.emit('concat_end', concat_content.join(' '));
				index = total = 0;
				concat_content = [];
			}
		}
	});
}


// get file from 'i.gtimg.cn'
function readWebFile(path, filename, idx){
	var resData = "";
	var req = http.request({
		hostname : 'i.gtimg.cn',
		port : 80,
		path : path + filename,
		method : 'get'
	}, function (response){
		response.setEncoding('utf8');
		response.on('data', function (data){
			resData += data;
		});
		response.on('end', function (){
			concat_content[idx] = resData;
			if (index++ == total - 1){
				_emitter.emit('concat_end', concat_content.join(' '));
				index = total = 0;
				concat_content = [];
			}
		});
	});
	req.end();
}



// get concat request from local files
// Parallel
function get_concat_local(urlArr){
	var webPath = "", localPath = "", filename = "", _url = "";
	var nameReg = new RegExp('[^/]*\\..+$'),
		pathReg = new RegExp('(.+\/).*$');
	total = urlArr.length;
	for (var i = 0; i < total; i++){
		_url = urlArr[i];
		try {
			filename = _url.match(nameReg)[0];
			webPath = _url.match(pathReg)[1];
		} catch (_){
			_emitter.emit('concat_end', 'concat file path parse failed! ');
		}
		if (localPath = CONFIG.local[webPath]){
			readLocalFile(localPath, filename, i);
		} else if (CONFIG.web[webPath]){
			readWebFile(webPath, filename, i);
		} else {
			_emitter.emit('concat_end', 'Path "' + webPath + '" is out of config file.');
		}
		
	}	
}

// read config file
var _config = '';

try {
	var configFileReader = file.readFileSync('./config.js', 'utf8');
	_config = eval(configFileReader);
	console.log("config file loaded! ");
} catch (e){
	file.exists('./config.js', function (exists){
		if (exists){
			console.log('config file open failed.');
		} else {
			console.log('file is not be found! ');
		}
		return;
	});
}


// start server
http.createServer(function (request, response){
	var uri = url.parse(request.url).pathname;
	response.writeHead(200, {
		'Content-Type': 'application/x-javascript; charset=utf-8'});
	if (uri.indexOf('/c/=/') == 0){
		var concatUrl = uri.slice(4).split(',');
		_emitter.once('concat_end', function (content){
			response.write(content);
			response.end();
		});
		get_concat_local(concatUrl);
	} else {
		response.write('this is a normal request!');
		response.end();
	}
	
}).listen(2013);
