import Image from "next/image";
import React from "react";

const Contact = ({ img, address, name }: any) => {
  return (
    <span className="flex justify-between my-2">
      <span className="flex">
        <Image
          src={img}
          alt=""
          className="w-[48px] h-[48px] object-cover border border-[#0795B0] rounded-full bg-[#0A0E0E]"
        />
        <span className="ml-3">
          <h3 className="text-white font-semibold">{address}</h3>
          <h5 className="text-[#5A6B83] text-sm">{name}</h5>
        </span>
      </span>
    </span>
  );
};

export default Contact;
