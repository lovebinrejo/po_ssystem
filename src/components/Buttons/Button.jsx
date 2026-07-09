function Button({
  text,
  onclick,
  type = 'button',
  className = 'px-4 py-2 rounded'
}) {
  return (
    <button type={type} onClick={onclick} className={`bg-[#397db9] text-white text-sm font-semibold hover:bg-[#2c6291] focus:outline-none focus:ring-2 focus:ring-[#2c6291] transition ${className}`}>
      {text}
    </button>
  );
}

export default Button;