import { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Link } from 'react-router-dom';

import Logo from '../../assets/logo1.png';
import FormSuccess from '../../components/loading/FormSuccess';
import Divider from './components/Divider';
import RegisterForm from './components/RegisterForm';

const Register = () => {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);

  return (
    <div className="flex justify-center items-center w-full h-[100vh] bg-gray-900">
      <div className="mt-4 mb-4  bg-slate-800 py-10 md:py-5 w-full h-[95vh] sm:h-auto sm:w-[400px]  shadow-lg rounded-md text-white">
        {isFormOpen ? (
          <>
            <LazyLoadImage
              className="w-[70%] mx-auto border-b border-neutral-700 hidden sm:block"
              src={Logo}
              alt="logo"
              effect="blur"
            />
            <h1 className="text-3xl font-semibold text-center sm:hidden mb-4">
              Create Account
            </h1>
            <RegisterForm setIsFormOpen={setIsFormOpen} />
            <div className="text-center mb-3">
              <Divider />
              <Link className="hover:text-neutral-300 duration-200" to="/login">
                Have an account? Login
              </Link>
            </div>
          </>
        ) : (
          <FormSuccess message="Account created" redirectTo="login" />
        )}
      </div>
    </div>
  );
};

export default Register;
