import { useField } from "formik";
import React from "react";

const SelectInput = ({ label, ...props }:any) => {
  const [field, meta] = useField(props);
  return (
    <>
      <div>
        <label htmlFor={props.id || props.name}>{label}</label>
        <select
          className="border border-[#0795B0] rounded-lg px-4 py-6 bg-transparent text-white text-sm outline-none"
          {...field}
          {...props}
        />
        {meta.touched && meta.error ? (
          <div className="error">{meta.error}</div>
        ) : null}
      </div>
    </>
  );
};

export default SelectInput;
