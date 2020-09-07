let express = require('express');
let mongo = require('mongodb');
let bodyParser = require('body-parser');
let path = require('path');

let urlencodedParser = bodyParser.urlencoded({ extended: false });
let dbUrl="mongodb+srv://therealrahulsahu:rahulsahu1_@democluster.2u6fb.gcp.mongodb.net/board_infy?retryWrites=true&w=majority&connectTimeoutMS=9000000";
let MClient = mongo.MongoClient;
let app = express();


app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/index.html'));
});

app.post('/add', urlencodedParser, function (req, res) {
  console.log('add hit');
  let query = {
    task_name: req.body.task_name,
    task_description: req.body.task_description,
    creator: req.body.creator,
    duration: parseInt(req.body.duration),
    created_at: (() => {
      let curr = new Date();
      return curr.getTime();
    })(),
    is_expired: 0
  };
  //console.log(query);
  MClient.connect(dbUrl, (err, db) => {
    if(err) throw err;
    db.db('board_infy').collection('tasks').insertOne(query, (err, resp) => {
      if(err) throw err;
      res.redirect('/');
      //console.log('add done');
      db.close();
    })
  })
});

let fetchNonExpiredList = (response) => {
	let query = {
    is_expired: 0
  };
  let required = {
    projection: {
      _id:0,
      task_name: 1,
      task_description: 1,
      creator: 1,
      duration: 1,
      created_at: 1
    }
  };
  MClient.connect(dbUrl, (err, db) => {
    if(err) throw err;
    db.db('board_infy').collection('tasks').find(query, required).toArray((err, resp) => {
      if(err) throw err;
      response.send(JSON.stringify(resp));
      //console.log('list done');
      db.close();
    })
  });
};

let setExpiredForId = (doc_id) => {
	MClient.connect(dbUrl, function(err, db) {
	  if (err) throw err;
	  var myquery = { _id: doc_id };
	  var newvalues = { $set: {is_expired: 1} };
	  db.db("board_infy").collection("tasks").updateOne(myquery, newvalues, function(err, res) {
		if (err) throw err;
		db.close();
	  });
	});
};

let checkForExpired = (response) => {
	let query = {
    is_expired: 0
  };
	let required = {
    projection: {
      _id:1,
      duration: 1,
      created_at: 1
    }
  };
	MClient.connect(dbUrl, (err, db) => {
    if(err) throw err;
    db.db('board_infy').collection('tasks').find(query, required).toArray((err, resp) => {
      if(err) throw err;
        
    for(x in resp){
      let tuple = resp[x];
      let expDate = new Date(tuple['created_at']+tuple.duration*60000);
      let currDate = new Date();
      if(currDate.getTime() > expDate.getTime()){
        setExpiredForId(tuple['_id']);
      }  
    }
    fetchNonExpiredList(response);
    db.close();
    })
  });
};



app.get('/list', function (req, res) {
  console.log('list hit');
  //fetchNonExpiredList(res);
	checkForExpired(res);
	
});

let server = app.listen(3000, () => {
  console.log("Server Started::::")
});