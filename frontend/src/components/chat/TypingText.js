import React, { useEffect, useState } from "react";


const TypingText = ({ text = "", speed = 12 }) => {
const [display, setDisplay] = useState("");


useEffect(() => {
setDisplay("");
let i = 0;
const id = setInterval(() => {
setDisplay((prev) => prev + text.charAt(i));
i++;
if (i >= text.length) clearInterval(id);
}, speed);
return () => clearInterval(id);
}, [text, speed]);


return <span>{display}</span>;
};


export default TypingText;