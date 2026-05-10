// adapted from react typescript docs: https://react.dev/learn/typescript#typescript-with-react-components
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/*
* children: all the children inside the opening/closing tags of Button. 
    ie a Div: <Button><div></div></Button>

* ...props: are all the properties attached when creating the Button. 
    ie className and onClick: <Button className:"..." onClick(...) etc.></Button>
*/
export function Button({ children, ...props  }: ButtonProps) {
  // type colors = {
  //   black: "bg-black text-white",
  //   blue: "bg-blue-500 text-white",
  //   white: "bg-white text-black",
  // };
  return (
    <button {...props}>
      {children}
    </button>
  );
}