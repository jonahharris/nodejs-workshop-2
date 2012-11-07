var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server, { log: false })
  , members = require('./conf/members.json')
  ;

// ------------------------------------------------------------------------- //
// == LOCALS =============================================================== //
// ------------------------------------------------------------------------- //

var feedPosts = [];
var connections = [];

// ------------------------------------------------------------------------- //
// == ACCESSOR ============================================================= //
// ------------------------------------------------------------------------- //

function main ()
{
  server.listen(8080);
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
}
main();

// ------------------------------------------------------------------------- //
// == SOCKET.IO ============================================================ //
// ------------------------------------------------------------------------- //

io.sockets.on('connection',
  function (socket)
{
  connections.push(socket);
});

// ------------------------------------------------------------------------- //
// == MEMBER API =========================================================== //
// ------------------------------------------------------------------------- //

app.get('/members/:memberId',
  function (req, res)
{
  if (!req.params.memberId)
  {
    res.send(400);
    return;
  }

  var memberId = parseInt(req.params.memberId);
  var member = null;
  for (var i = 0; i < members.length; ++i)
  {
    if (members[i].id === memberId)
    {
      member = members[i];
      break;
    }
  }
  if (!member)
  {
    res.send(400);
    return;
  }

  res.contentType('application/json');
  res.send(JSON.stringify(member));
});

app.get('/members/:memberId/feed',
  function (req, res)
{
  if (!req.params.memberId)
  {
    res.send(400);
    return;
  }

  res.contentType('application/json');
  res.send(JSON.stringify(getMemberFeedItems(parseInt(req.params.memberId))));
});

// ------------------------------------------------------------------------- //
// == FEED API ============================================================= //
// ------------------------------------------------------------------------- //

app.get('/feed',
  function (req, res)
{
  var offset = parseInt(req.query.offset) || 0;
  var limit = parseInt(req.query.limit) || 10;

  res.contentType('application/json');
  res.send(JSON.stringify(feedPosts.slice(-10)));
});

app.post('/feed',
  function (req, res)
{
  if (!(req.body.content && req.body.member_id))
  {
    res.send(400);
    return;
  }

  var memberId = parseInt(req.body.member_id);
  var member = null;
  for (var i = 0; i < members.length; ++i)
  {
    if (members[i].id === memberId)
    {
      member = members[i];
      break;
    }
  }
  if (!member)
  {
    res.send(400);
    return;
  }

  var feedPost = { member_id: memberId, member: member.displayName, content: req.body.content };
  feedPosts.push(feedPost);
  res.send(200);

  for (var i = 0; i < connections.length; ++i)
      connections[i].emit('feedPost', feedPost);
});

// ------------------------------------------------------------------------- //
// == FUNCTIONS ============================================================ //
// ------------------------------------------------------------------------- //

function getMemberFeedItems (memberId)
{
  var memberFeedItems = [];

  for (var i = 0; i < feedPosts.length; ++i)
    if (memberId === feedPosts[i].member_id)
      memberFeedItems.push(feedPosts[i]);

  return memberFeedItems;
}

