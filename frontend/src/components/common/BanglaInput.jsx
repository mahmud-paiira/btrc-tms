import { useCallback } from 'react';
import avro from 'nodejs-avro-phonetic';
const avroParse = avro.parse.bind(avro);

const IS_LATIN = /^[a-zA-Z0-9`~!@#$%^&*()_\-+=[\]{}|;:'",.<>/?\\]+$/;
const LATIN_WORD = /([a-zA-Z0-9`~!@#$%^&*()_\-+=[\]{}|;:'",.<>/?\\]+)(\s+)$/;

export default function BanglaInput({ value, onChange, onBlur, as: As = 'input', ...props }) {
  const handleChange = useCallback((e) => {
    let val = e.target.value;
    if (val.endsWith(' ') || val.endsWith('\n')) {
      val = val.replace(LATIN_WORD, (_, word, spaces) => avroParse(word) + spaces);
    }
    if (onChange) {
      onChange({
        target: {
          name: e.target.name,
          value: val,
          type: e.target.type,
          checked: e.target.checked,
        },
      });
    }
  }, [onChange]);

  const handleBlur = useCallback((e) => {
    let val = e.target.value;
    const parts = val.split(/(\s+)/);
    const last = parts[parts.length - 1];
    if (IS_LATIN.test(last)) {
      parts[parts.length - 1] = avroParse(last);
      val = parts.join('');
    }
    if (val !== e.target.value && onChange) {
      onChange({
        target: {
          name: e.target.name,
          value: val,
          type: e.target.type,
          checked: e.target.checked,
        },
      });
    }
    if (onBlur) onBlur(e);
  }, [onChange, onBlur]);

  return <As value={value} onChange={handleChange} onBlur={handleBlur} {...props} />;
}
