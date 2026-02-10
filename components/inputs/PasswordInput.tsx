import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useField } from 'formik';
import React, { useState } from 'react'

const PasswordInput = ({ label, ...props }: any) => {
    const [field, meta] = useField(props);
    const [passwordVisibility, setPasswordVisibility] = useState("password");
    return (
      <article className="my-5">
        <label htmlFor={props.id || props.name} className="text-white">
          {label}
        </label>
        <div className="flex justify-between bg-white rounded-full py-2 px-6 w-full focus:outline-none ring-offset-[#0CAF60] focus-visible:bg-transparent">
          <input
            type={passwordVisibility}
            {...field}
            {...props}
            id=""
            className="py-1 w-full focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => {
              passwordVisibility == "password"
                ? setPasswordVisibility("text")
                : setPasswordVisibility("password");
            }}
          >
            {passwordVisibility == "password" ? (
              <EyeSlash size={24} />
            ) : (
              <Eye size={24} />
            )}
          </button>
        </div>
        {meta.touched && meta.error ? (
          <div className="error text-red-500 text-sm mt-1">{meta.error}</div>
        ) : null}
      </article>
    );
  };

export default PasswordInput