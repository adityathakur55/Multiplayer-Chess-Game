const express= require("express");
const  socket= require("socket.io");
const http= require("http");
const {Chess} = require("chess.js");
const path = require("path");

const app= express();

const server= http.createServer(app);
const io= socket(server);

const chess= new Chess();
let players = {};
let currentPlayer = "W";
let capturedWhitePieces = [];
let capturedBlackPieces = [];

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", {title: "Chess Game"});
});

const resetGame = () => {
  chess.reset();
  players = {};
  currentPlayer = "w";
  io.emit("resetGame"); // Notify clients to reset their state
};

io.on("connection", function (uniquesocket) {
   console.log("connected");
    

   if(!players.white){
     players.white= uniquesocket.id;
     uniquesocket.emit("playerRole", "w");
   }
   else if(!players.black){
     players.black= uniquesocket.id;
     uniquesocket.emit("playerRole", "b");
   }
   else{
     uniquesocket.emit("spectatorRole");
   }

   uniquesocket.on("disconnect", function() {
    console.log("disconnected");

    if(uniquesocket.id === players.white){
        delete players.white;
    } else if (uniquesocket.id === players.black){
        delete players.black;
    }
     resetGame();
        io.emit("gameOver", "A player has disconnected. The game is reset.");
  });

  uniquesocket.on("move", (move) => {
    try{
        if(chess.turn() === "w" && uniquesocket.id !== players.white) return;
        if(chess.turn() === "b" && uniquesocket.id !== players.black) return;

        const targetPiece = chess.get(move.to);

        const result= chess.move(move);
        
        if(result){

          if (targetPiece) {
            if (targetPiece.color === "w") {
                capturedWhitePieces.push(targetPiece);
            } else {
                capturedBlackPieces.push(targetPiece);
            }
          }

          currentPlayer= chess.turn();
          io.emit("move", move);
          io.emit("boardState", chess.fen());

          io.emit("syncCapturedPieces", { capturedWhitePieces, capturedBlackPieces });

          if (chess.isCheckmate()) {
            const winner = chess.turn() === "w" ? "Black" : "White";
            io.emit("gameOver", { result: "checkmate", winner });
            resetGame();
          } else if (chess.isStalemate()) {
            io.emit("gameOver", { result: "stalemate", winner: null });
            resetGame();}
      
          if (chess.isGameOver()) {
          io.emit("gameOver", chess.turn() === "b" ? "White wins!" : "Black wins!");
          resetGame();
            }
          } else{
          console.log("Invalid move :", move);
          uniquesocket.emit("invalidMove", move);
          }
     } catch (err) {
      console.log(err);
      uniquesocket.emit("Invalid move :", move);
     }
  });

  function resetGame() {
    chess.reset();
    capturedPieces = { white: [], black: [] };
    io.emit("boardState", chess.fen());
    io.emit("capturedPieces", capturedPieces);
}
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, function () {
    console.log("listing on port 3000");
} );
