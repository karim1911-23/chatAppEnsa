import { FC, ReactNode } from 'react'
import { useLocation } from 'react-router-dom';
import ContentArea from './ContentArea';
import Sidebar from './Sidebar';


type Props = {
    children: ReactNode;
}
const Layout: FC<Props> = ({ children }) => {
    const location = useLocation();
    if (location.pathname === '/login' || location.pathname === '/register') {
        return (
            <>
                {children}
            </>
        )
    }
/*     grid grid-cols-1 md:grid-cols-5 xl:grid-cols-7 
 */    return (
        <div className='h-[100vh] w-[100%] flex items-center justify-center'>
            <div className='flex justify-center  lg:w-[100%] lg:h-[100%] max-w-[1600px] w-full h-full md:max-h-[1000px] bg-neutral-800 '>
                <Sidebar />
                <ContentArea>
                {children}
                </ContentArea>
            </div>
        </div>
    )


}

export default Layout;