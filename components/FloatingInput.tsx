function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: any) => void;
}) {
  const isFilled = value.length > 0;

  return (
    <div className="relative w-full">
      <fieldset
        className={`
          border rounded-lg px-3 pt-4 pb-2 transition-all
          ${isFilled ? 'border-red-500' : 'border-red-900/50'}
          focus-within:border-red-500
        `}
      >
        <legend
          className={`
            px-2 text-sm transition-all
            ${isFilled ? 'opacity-100 text-red-400' : 'opacity-0'}
          `}
        >
          {label}
        </legend>

        <input
          type={type}
          value={value}
          onChange={onChange}
          required
          placeholder={label}
          className="
            w-full bg-transparent outline-none text-red-100
            placeholder:text-red-400/50
          "
        />
      </fieldset>
    </div>
  );
}
