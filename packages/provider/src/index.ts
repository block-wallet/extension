import BlankProvider from './provider/BlankProvider';
import {
    Origin,
    WindowTransportResponseMessage,
} from '@block-wallet/background/utils/types/communication';
import log, { LogLevelDesc } from 'loglevel';
import shimWeb3 from './utils/shimWeb3';
import { EIP6963ProviderInfo, InjectedWindow, SignalMessage } from './types';

// Setting the default log level:
log.setLevel((process.env.LOG_LEVEL as LogLevelDesc) || 'warn');

const blankProvider: BlankProvider = new BlankProvider();

const provider = new Proxy(blankProvider, {
    deleteProperty: () => true,
});

function announceProvider() {
    const info: EIP6963ProviderInfo = {
        uuid: '350670db-19fa-4704-a166-e52e178b59d2',
        name: 'BlockWallet',
        icon: "data:image/svg+xml;charset=UTF-8,%3csvg width='788' height='789' viewBox='0 0 788 789' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cg clip-path='url(%23clip0_1266_227)'%3e%3cpath d='M393.94 0.340332C176.37 0.340332 0 176.71 0 394.28C0 611.85 176.37 788.22 393.94 788.22C611.51 788.22 787.88 611.85 787.88 394.28C787.88 176.71 611.5 0.340332 393.94 0.340332ZM588.35 625.46L176.33 496.77L244.17 111.03L656.19 239.72L588.34 625.47L588.35 625.46Z' fill='%23327100'/%3e%3cpath d='M51.92 198.68C18.89 256.31 0 323.09 0 394.28C0 399.23 0.09 404.16 0.28 409.07L77.37 331.39L117 152.23L51.93 198.68H51.92Z' fill='url(%23paint0_linear_1266_227)'/%3e%3cpath d='M180.387 475.35L81.5572 367.07L2.61719 437.18C17.1572 571.44 99.1572 685.47 214.027 744.67L327.147 636.14L209.257 506.98L176.627 496.79L180.397 475.36L180.387 475.35Z' fill='url(%23paint1_linear_1266_227)'/%3e%3cpath d='M286.113 531.33L210.513 507.72L91.2031 647.35C163.463 733.47 271.893 788.22 393.103 788.22C412.893 788.22 432.343 786.75 451.343 783.94L521.363 687.46L286.113 531.34V531.33Z' fill='url(%23paint2_linear_1266_227)'/%3e%3cpath d='M666.137 227.99L621.997 280.15L209.977 151.46L254.127 99.3003L666.137 227.99Z' fill='%23122600'/%3e%3cpath d='M612.519 211.021L606.039 261.46L622.379 266.46L655.889 224.741L612.519 211.021Z' fill='url(%23paint3_linear_1266_227)'/%3e%3cpath d='M597.617 613.63L553.477 665.79L621.327 280.03L665.467 227.87L597.617 613.63Z' fill='%2354C900'/%3e%3cpath d='M501.908 15.3201C724.798 81.3401 820.238 298.46 777.478 481.06C734.248 665.71 550.658 773.99 348.608 720.96C146.448 667.92 27.2882 477.89 58.4882 272.82C91.1982 57.9001 294.478 -40.3299 501.908 15.3201ZM600.188 615.41L668.038 229.66L256.018 100.98L188.168 486.73L600.188 615.42' fill='url(%23paint4_linear_1266_227)'/%3e%3cpath d='M451.418 735.86C417.848 735.86 383.508 731.43 349.188 722.42C299.518 709.38 253.918 687.92 213.678 658.61C174.698 630.23 141.748 595.27 115.728 554.71C63.2481 472.88 42.7281 372.68 57.9581 272.59C65.6481 222.06 82.9081 176.58 109.258 137.41L111.748 139.08C85.6481 177.88 68.5481 222.95 60.9281 273.04C45.8081 372.41 66.1681 471.87 118.258 553.09C144.068 593.34 176.768 628.03 215.448 656.19C255.388 685.27 300.638 706.58 349.948 719.52C462.468 749.05 575.268 729.03 659.418 664.6L661.238 666.98C602.038 712.31 528.788 735.86 451.418 735.86Z' fill='url(%23paint5_linear_1266_227)'/%3e%3cpath d='M600.153 617.11L594.243 616.07L661.633 232.91L252.133 105.01L253.923 99.2803L665.943 227.97C667.383 228.42 668.263 229.87 668.003 231.35L600.153 617.1V617.11Z' fill='url(%23paint6_linear_1266_227)'/%3e%3cpath d='M591.889 618.67L181.469 490.48L249.779 102.13L255.679 103.17L188.299 486.33L593.679 612.94L591.889 618.67Z' fill='url(%23paint7_linear_1266_227)'/%3e%3cpath d='M618.672 295.76L621.322 280.24L661.712 232.51L658.962 248.15L618.672 295.76Z' fill='url(%23paint8_linear_1266_227)'/%3e%3cpath d='M623.383 290.21L650.313 297.5L658.993 248.13L623.383 290.21Z' fill='url(%23paint9_linear_1266_227)'/%3e%3cpath d='M502.279 15.3203C467.739 6.06031 433.229 1.36031 399.539 0.820312C608.029 11.0003 773.939 183.26 773.939 394.28C773.939 489.56 740.109 576.93 683.819 645.06C729.149 603.63 762.259 547.66 777.849 481.07C820.609 298.46 725.169 81.3503 502.279 15.3303V15.3203Z' fill='url(%23paint10_linear_1266_227)'/%3e%3c/g%3e%3cdefs%3e%3clinearGradient id='paint0_linear_1266_227' x1='-9.49' y1='208.51' x2='90.13' y2='314' gradientUnits='userSpaceOnUse'%3e%3cstop offset='0.29' stop-color='%23327100'/%3e%3cstop offset='0.3' stop-color='%233C7B06'/%3e%3cstop offset='0.34' stop-color='%235B9B1B'/%3e%3cstop offset='0.38' stop-color='%2373B42C'/%3e%3cstop offset='0.43' stop-color='%2385C637'/%3e%3cstop offset='0.47' stop-color='%238FD03E'/%3e%3cstop offset='0.53' stop-color='%2393D441'/%3e%3cstop offset='0.74' stop-color='%2391D23F'/%3e%3cstop offset='0.82' stop-color='%238ACB3B'/%3e%3cstop offset='0.87' stop-color='%237EBF33'/%3e%3cstop offset='0.92' stop-color='%236EAE28'/%3e%3cstop offset='0.95' stop-color='%2358981A'/%3e%3cstop offset='0.99' stop-color='%233E7E08'/%3e%3cstop offset='1' stop-color='%23327100'/%3e%3c/linearGradient%3e%3clinearGradient id='paint1_linear_1266_227' x1='14.3272' y1='446.77' x2='261.337' y2='662.91' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23327100'/%3e%3cstop offset='0.05' stop-color='%234A8A10'/%3e%3cstop offset='0.11' stop-color='%2364A422'/%3e%3cstop offset='0.18' stop-color='%2379B92F'/%3e%3cstop offset='0.26' stop-color='%2387C839'/%3e%3cstop offset='0.35' stop-color='%2390D13F'/%3e%3cstop offset='0.49' stop-color='%2393D441'/%3e%3cstop offset='0.72' stop-color='%2391D23F'/%3e%3cstop offset='0.8' stop-color='%238ACB3B'/%3e%3cstop offset='0.86' stop-color='%237EBF33'/%3e%3cstop offset='0.91' stop-color='%236EAE28'/%3e%3cstop offset='0.95' stop-color='%2358981A'/%3e%3cstop offset='0.99' stop-color='%233E7E08'/%3e%3cstop offset='1' stop-color='%23327100'/%3e%3c/linearGradient%3e%3clinearGradient id='paint2_linear_1266_227' x1='171.203' y1='571.83' x2='450.293' y2='782.37' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23A2D159' stop-opacity='0'/%3e%3cstop offset='0.06' stop-color='%23749B3C' stop-opacity='0.31'/%3e%3cstop offset='0.17' stop-color='%233C581A' stop-opacity='0.7'/%3e%3cstop offset='0.29' stop-color='%231C3106' stop-opacity='0.93'/%3e%3cstop offset='0.49' stop-color='%23122600'/%3e%3cstop offset='0.73' stop-color='%23122700'/%3e%3cstop offset='0.82' stop-color='%23152E00'/%3e%3cstop offset='0.88' stop-color='%231A3A00'/%3e%3cstop offset='0.93' stop-color='%23214B00'/%3e%3cstop offset='0.98' stop-color='%232B6100'/%3e%3cstop offset='1' stop-color='%23327100'/%3e%3c/linearGradient%3e%3clinearGradient id='paint3_linear_1266_227' x1='650.229' y1='171.721' x2='618.349' y2='263.531' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23C7FF00'/%3e%3cstop offset='1' stop-color='%2353C200' stop-opacity='0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint4_linear_1266_227' x1='199.508' y1='446.98' x2='709.368' y2='260.42' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23C7FF00'/%3e%3cstop offset='1' stop-color='%2353C200'/%3e%3c/linearGradient%3e%3clinearGradient id='paint5_linear_1266_227' x1='1.92809' y1='186.14' x2='568.998' y2='814.6' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23C7FF00' stop-opacity='0'/%3e%3cstop offset='0.06' stop-color='%238EBA00' stop-opacity='0.31'/%3e%3cstop offset='0.17' stop-color='%23476600' stop-opacity='0.7'/%3e%3cstop offset='0.29' stop-color='%231E3500' stop-opacity='0.93'/%3e%3cstop offset='0.49' stop-color='%23122600'/%3e%3cstop offset='0.77' stop-color='%231A3000' stop-opacity='0.95'/%3e%3cstop offset='0.87' stop-color='%233B5700' stop-opacity='0.77'/%3e%3cstop offset='0.94' stop-color='%23739A00' stop-opacity='0.46'/%3e%3cstop offset='1' stop-color='%23C7FF00' stop-opacity='0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint6_linear_1266_227' x1='511.543' y1='308.96' x2='361.963' y2='-101.83' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23C7FF00'/%3e%3cstop offset='1' stop-color='%2353C200' stop-opacity='0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint7_linear_1266_227' x1='232.839' y1='550.62' x2='515.809' y2='264.3' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2343A000'/%3e%3cstop offset='0.41' stop-color='%2343A000' stop-opacity='0.99'/%3e%3cstop offset='0.56' stop-color='%2345A103' stop-opacity='0.95'/%3e%3cstop offset='0.66' stop-color='%2349A307' stop-opacity='0.87'/%3e%3cstop offset='0.75' stop-color='%234EA70D' stop-opacity='0.77'/%3e%3cstop offset='0.82' stop-color='%2355AB15' stop-opacity='0.63'/%3e%3cstop offset='0.88' stop-color='%235DB01E' stop-opacity='0.46'/%3e%3cstop offset='0.94' stop-color='%2367B72A' stop-opacity='0.26'/%3e%3cstop offset='0.99' stop-color='%2372BE37' stop-opacity='0.03'/%3e%3cstop offset='1' stop-color='%2374BF39' stop-opacity='0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint8_linear_1266_227' x1='678.332' y1='235.81' x2='537.702' y2='340.26' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23C7FF00'/%3e%3cstop offset='1' stop-color='%2353C200' stop-opacity='0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint9_linear_1266_227' x1='648.793' y1='237.84' x2='635.543' y2='299.96' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2374BF39' stop-opacity='0'/%3e%3cstop offset='0.06' stop-color='%23558E27' stop-opacity='0.31'/%3e%3cstop offset='0.17' stop-color='%232F5310' stop-opacity='0.7'/%3e%3cstop offset='0.29' stop-color='%23183003' stop-opacity='0.93'/%3e%3cstop offset='0.49' stop-color='%23122600'/%3e%3cstop offset='0.77' stop-color='%23162D02' stop-opacity='0.95'/%3e%3cstop offset='0.87' stop-color='%2328480C' stop-opacity='0.77'/%3e%3cstop offset='0.94' stop-color='%2346781E' stop-opacity='0.46'/%3e%3cstop offset='1' stop-color='%2374BF39' stop-opacity='0'/%3e%3c/linearGradient%3e%3clinearGradient id='paint10_linear_1266_227' x1='594.389' y1='200.88' x2='621.179' y2='587.11' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%2374BF39' stop-opacity='0'/%3e%3cstop offset='0.01' stop-color='%236FBC34' stop-opacity='0.09'/%3e%3cstop offset='0.06' stop-color='%2363B426' stop-opacity='0.33'/%3e%3cstop offset='0.11' stop-color='%2359AE1A' stop-opacity='0.54'/%3e%3cstop offset='0.17' stop-color='%2351A910' stop-opacity='0.71'/%3e%3cstop offset='0.23' stop-color='%234BA509' stop-opacity='0.84'/%3e%3cstop offset='0.29' stop-color='%2346A204' stop-opacity='0.93'/%3e%3cstop offset='0.37' stop-color='%2343A000' stop-opacity='0.98'/%3e%3cstop offset='0.49' stop-color='%2343A000'/%3e%3cstop offset='0.7' stop-color='%2343A000' stop-opacity='0.99'/%3e%3cstop offset='0.77' stop-color='%2345A103' stop-opacity='0.95'/%3e%3cstop offset='0.83' stop-color='%2349A307' stop-opacity='0.87'/%3e%3cstop offset='0.87' stop-color='%234EA70D' stop-opacity='0.77'/%3e%3cstop offset='0.91' stop-color='%2355AB15' stop-opacity='0.63'/%3e%3cstop offset='0.94' stop-color='%235DB01E' stop-opacity='0.46'/%3e%3cstop offset='0.97' stop-color='%2367B72A' stop-opacity='0.26'/%3e%3cstop offset='1' stop-color='%2374BF39' stop-opacity='0'/%3e%3c/linearGradient%3e%3cclipPath id='clip0_1266_227'%3e%3crect width='787.87' height='788.21' fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e ",
        rdns: 'io.blockwallet.extension',
    };
    window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', {
            detail: Object.freeze({ info, provider }),
        })
    );
}

window.addEventListener('eip6963:requestProvider', () => {
    announceProvider();
});
announceProvider();

shimWeb3(provider);

(window as Window & InjectedWindow).ethereum = provider;

window.dispatchEvent(
    new CustomEvent('ethereum#initialized', { detail: 'isBlockWallet' })
);

// Listens to events generated by the background script
window.addEventListener(
    'message',
    ({
        data,
        source,
    }: MessageEvent<WindowTransportResponseMessage | SignalMessage>): void => {
        // Only allow messages from our window, by the loader
        if (
            source !== window ||
            data.origin !== Origin.BACKGROUND ||
            !blankProvider
        ) {
            return;
        }

        // Check if we're reinitializing the SW
        if ('signal' in data) {
            blankProvider.handleSignal(data.signal);
        } else if (data.id) {
            blankProvider.handleResponse(data);
        } else {
            log.error('Missing response id.');
        }
    }
);
