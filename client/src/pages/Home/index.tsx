import { LazyLoadImage } from "react-lazy-load-image-component"
import Logo from "../../assets/chatapp.png";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center p-3">
        <LazyLoadImage
          src={Logo}
          alt="logo"
          effect="blur"
          className="max-w-[500px]"
        />
        
        <Link
          to='/addfriend'
          className="bg-neutral-600 rounded-md px-5 py-3 text-xl mt-8">
          Find Your Friends
        </Link>
      </div>
    </div>
  )
}

export default Home