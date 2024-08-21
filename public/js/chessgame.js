const socket = io();
const chess= new Chess();
const boardElement = document.querySelector(".chessboard");
const capturedWhiteElement = document.querySelector(".captured-white");
const capturedBlackElement = document.querySelector(".captured-black");


let draggedPiece= null;
let sourceSquare= null;
let playerRole= null;

const capturedWhitePieces = [];
const capturedBlackPieces = [];

const renderBoard = () => {

    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if(square){
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText= getPieceUnicode(square);
                pieceElement.draggable = square.color === playerRole ;

                pieceElement.addEventListener("dragstart", (e) => {
                    if(pieceElement.draggable){
                        draggedPiece = pieceElement;
                        sourceSquare = {row: rowindex, col: squareindex};
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece= null;
                    sourceSquare= null;

                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", function(e) {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", function(e) {
                e.preventDefault();
                if(draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),

                    };

                    handleMove(sourceSquare, targetSource);
                }
            });
            
            boardElement.appendChild(squareElement);

        });
    });

    

    if( playerRole === "b"){
        boardElement.classList.add("flipped");
    }
    else{
        boardElement.classList.remove("flipped");
    }

   
    
};


    


const renderCapturedPieces = () => {

    whiteCapturedContainer.innerHTML = "";
    blackCapturedContainer.innerHTML = "";

    capturedWhiteElement.innerHTML = capturedWhitePieces.map(getPieceUnicode).join(" ");
    capturedBlackElement.innerHTML = capturedBlackPieces.map(getPieceUnicode).join(" ");

   

    capturedWhitePieces.forEach(piece => {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", "white");
        pieceElement.innerText = getPieceUnicode(piece);
        whiteCapturedContainer.appendChild(pieceElement);
    });

    capturedBlackPieces.forEach(piece => {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", "black");
        pieceElement.innerText = getPieceUnicode(piece);
        blackCapturedContainer.appendChild(pieceElement);
    });
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q'
    };

    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♙",
        r: "♜",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♙",
        R: "♜",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔",
    };

    return unicodePieces[piece.type] || "";
};



socket.on("playerRole", function(role){
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", function(){
    playerRole = null;
    renderBoard();
});

socket.on("boardState", function(fen){
    chess.load(fen);
    renderBoard();
});

socket.on("move", function (move) {
    chess.move(move);
    renderBoard();
});

socket.on("capturedPieces", ({ white, black }) => {
    capturedWhitePieces = white;
    capturedBlackPieces = black;
    renderCapturedPieces();
});

socket.on("syncCapturedPieces", function ({ capturedWhitePieces: white, capturedBlackPieces: black }) {
    capturedWhitePieces.length = 0; 
    capturedBlackPieces.length = 0; 

    white.forEach(piece => capturedWhitePieces.push(piece));
    black.forEach(piece => capturedBlackPieces.push(piece));

    renderCapturedPieces(); 
});

socket.on("gameOver", function ({ result, winner }) {
    let message = "";
    if (result === "checkmate") {
        message = `${winner} wins by checkmate!`;
    } else if (result === "stalemate") {
        message = "It's a stalemate!";
    }

    alert(message);  

    if (winner) {
        showCelebration(); 
    }
    socket.emit("resetGame");
    renderBoard();
    renderCapturedPieces();
});


socket.on("resetGame", function () {
    chess.reset();
    capturedWhitePieces = [];
    capturedBlackPieces = [];
    playerRole = null;
    renderBoard();
});


renderBoard();
renderCapturedPieces();