function Button({
  text,
  onclick,
  type = 'button'
}) {
  return (
    <button type={type} onClick={onclick} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-700 transition">
      {text}
    </button>
  );
}

export default Button;