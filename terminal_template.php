<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Redirecionamento</title>
    PHP_META_TAG
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 18px;
            font-family: "vazir", sans-serif;
            background: #171f37;
            color: rgba(255, 255, 255, 0.8);
            overflow: hidden !important;
        }

        a {
            text-decoration: none;
        }

        svg {
            vertical-align: middle;
        }

        main {
            width: 80%;
            height: 60%;
            -webkit-transition: all .3s ease-in-out;
            -moz-transition: all .3s ease-in-out;
            -ms-transition: all .3s ease-in-out;
            -o-transition: all .3s ease-in-out;
            transition: all .3s ease-in-out;
        }

        .Menubar {
            width: 100%;
            background-color: #313335;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            border-radius: 1.2rem 1.2rem 0 0;
            padding: .1rem .6rem;
            user-select: none;
            font-weight: 500;
        }

        .title_404 {
            font-weight: 800;
        }

        .Menu_BTN {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .Menu_BTN a {
            content: "";
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin: 0 .2rem;
        }

        .Menu_BTN a:nth-child(3) {
            background-color: #fa615c;
        }

        .Menu_BTN a:nth-child(2) {
            background-color: #ffbd48;
        }

        .Menu_BTN a:nth-child(1) {
            background-color: #3fc950;
        }

        .Terminal_body {
            background-color: #2B2B2B;
            width: 100%;
            height: 100%;
            border-radius: 0 0 1.2rem 1.2rem;
            padding: 1.2rem;
            font-family: "Anonymous Pro", monospace;
            overflow-y: auto;
        }

        .Terminal_body::-webkit-scrollbar {
            background-color: #2B2B2B;
        }

        .Terminal_body::-webkit-scrollbar-thumb {
            background-color: #5C5C5C;
        }

        .arrow {
            color: #ffc720;
            margin: 0 0 0 .8rem;
            font-weight: bold;
            font-size: 1.4rem;
        }

        .keyboard {
            opacity: 0;
            filter: alpha(opacity=0);
        }

        .out_code {
            margin: .5rem 0;
        }

        .red {
            color: #fa615c;
        }

        .green {
            color: #3fc950;
        }

        #userInput::after {
            content: "";
            width: 5px;
            height: 15px;
            position: relative;
            display: inline-block;
            background: white;
            -webkit-animation: cursor 1s linear infinite;
            -o-animation: cursor 1s linear infinite;
            animation: cursor 1s linear infinite;
        }

        @keyframes cursor {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0;
            }
        }

        /*max style*/
        .max main {
            width: 100%;
            height: 100%;
        }

        .max .Menubar,
        .max .Terminal_body {
            border-radius: 0;
        }

        /*min style*/
        .min_app {
            visibility: hidden;
            position: absolute;
            width: 50px;
            height: 50px;
            left: 0;
            bottom: 0;
            background: #3C3F41;
            border-radius: 50%;
            margin: 1rem;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .min main {
            transform: translate(-640px, 260px) scale(0);
        }

        .min .min_app {
            visibility: visible;
        }

        @media (max-width: 991px) {
            main {
                width: 95%;
                height: 70%;
            }

            .out_code {
                margin: .2rem 0;
            }

            .keyboard {
                position: relative;
                width: 100%;
                left: 0;
                top: -35px;
                height: 50px;
            }

            .min main {
                transform: translate(-200px, 660px) scale(0);
            }
        }
    </style>
</head>

<body class="" id="body">
    <main id="main">
        <header class="Menubar">
            <div>
                <p>Terminal</p>
            </div>
            <div>
                <p class="title_404">PHP_TITLE_CODE</p>
            </div>
            <div class="Menu_BTN">
                <a href="#" id="min" onclick="BTNS('min')"></a>
                <a href="#" id="max" onclick="BTNS('max')"></a>
                <a href="#" id="close"></a>
            </div>
        </header>
        <div class="Terminal_body" id="Terminal">
            <p>
                PHP_MESSAGE
            </p>
            <p>Aguarde
                <span class="red">
                    PHP_TIME
                </span>
                e você será redirecionado automaticamente.
            </p>
            <br>
            <br>
        </div>
    </main>

    <div class="min_app" id="min_app">
        <a href="#" onclick="BTNS('re')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">
                <path fill="#CFD8DC" d="M41,6H7C6.4,6,6,6.4,6,7v35h36V7C42,6.4,41.6,6,41,6z" />
                <path fill="#263238" d="M8 13H40V40H8z" />
                <path fill="#90A4AE"
                    d="M13.5 8A1.5 1.5 0 1 0 13.5 11 1.5 1.5 0 1 0 13.5 8zM9.5 8A1.5 1.5 0 1 0 9.5 11 1.5 1.5 0 1 0 9.5 8z" />
                <g>
                    <path fill="#18FFFF" d="M18.5 26.5l-3.5-2V22l6 3.4v2.1L15 31v-2.5L18.5 26.5zM23 29H33V31H23z" />
                </g>
            </svg>
        </a>
    </div>
</body>
<script>
    //When the user clicks on a control buttons
    const BTNS = function MenuBTN(t) {
        switch (t) {
            case "max":
                if (document.getElementById("body").className !== "max") {
                    document.getElementById("body").className = "max";
                } else {
                    document.getElementById("body").className = "";
                }
                break;
            case "min":
                if (document.getElementById("body").className === "max") {
                    document.getElementById("body").className = "max min";
                } else if (document.getElementById("body").className !== "max") {
                    document.getElementById("body").className = "min";
                }
                break;
            case "re":
                if (document.getElementById("body").className === "max min") {
                    document.getElementById("body").className = "max";
                }
                if (document.getElementById("body").className === "min") {
                    document.getElementById("body").className = "";
                }
                break;
        }
    };
</script>

</html>