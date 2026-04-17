import sys

with open('src/app/home/home.component.html', 'r') as f:
    content = f.read()

marker = "<!-- ================= App Download Section ================= -->"
if marker not in content:
    print("Cannot find marker!")
    sys.exit(1)

new_section = """
    <!-- ================= Host Promotion Section ================= -->
    <div class="max-w-[105rem] mx-auto px-4 md:px-8 mt-24 md:mt-40 pt-24 md:pt-40 border-t border-white/10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        
        <!-- Left: Pixelated Image Masking -->
        <div class="relative w-full aspect-[4/5] md:aspect-[5/6] lg:aspect-square object-cover flex justify-center drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          <!-- 3-step 8-bit geometric block cutout via pure CSS Calc Polygon -->
          <img src="assets/images/masonry/masonry_7_alpaca.png" alt="Become a Host" 
               class="w-full h-full object-cover transition-transform duration-700 hover:scale-105 will-change-transform"
               style="clip-path: polygon(
                  60px 0, 100% 0, 
                  100% calc(100% - 60px), 
                  calc(100% - 20px) calc(100% - 60px), 
                  calc(100% - 20px) calc(100% - 40px), 
                  calc(100% - 40px) calc(100% - 40px), 
                  calc(100% - 40px) calc(100% - 20px), 
                  calc(100% - 60px) calc(100% - 20px), 
                  calc(100% - 60px) 100%, 
                  0 100%, 
                  0 60px, 
                  20px 60px, 
                  20px 40px, 
                  40px 40px, 
                  40px 20px, 
                  60px 20px, 
                  60px 0
               );">
        </div>

        <!-- Right: Aggressive Typography & Data -->
        <div class="flex flex-col py-12 lg:py-0">
           
           <h2 class="text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] font-headline font-bold text-white uppercase leading-[0.95] tracking-tight mb-12">
             TURN YOUR<br/>LAND INTO<br/><span class="text-gold">OPPORTUNITY</span>
           </h2>
           
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-16">
              <div>
                 <div class="flex items-center gap-2 mb-3 font-headline font-bold text-sm tracking-widest text-[#F1B434] uppercase"><span class="material-symbols-outlined text-[1.2rem]">payments</span> Avg Revenue</div>
                 <div class="text-white/90 font-body text-xl">$2,500 - $8,000 / Year</div>
              </div>
              <div>
                 <div class="flex items-center gap-2 mb-3 font-headline font-bold text-sm tracking-widest text-[#F1B434] uppercase"><span class="material-symbols-outlined text-[1.2rem]">verified_user</span> Host Support</div>
                 <div class="text-white/90 font-body text-xl">24/7 Concierge Line</div>
              </div>
           </div>

           <!-- Split Button Component -->
           <div>
             <div class="pointer-events-auto magnetic-btn group cursor-pointer inline-block mt-4">
               <a routerLink="/become-a-host" class="flex items-stretch gap-0 group-hover:gap-2 transition-all duration-300 no-underline">
                 
                 <!-- Left Text Side -->
                 <div class="bg-white group-hover:bg-gold text-dark-text group-hover:text-black rounded-l-[4px] group-hover:rounded-r-[4px] px-8 py-4 font-headline font-bold not-italic text-sm tracking-[0.15em] uppercase flex items-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 origin-center">
                   BECOME A HOST
                 </div>
                 
                 <!-- Right Icon Side -->
                 <div class="bg-white group-hover:bg-gold text-dark-text group-hover:text-black rounded-r-[4px] group-hover:rounded-l-[4px] px-5 py-4 border-l border-dashed border-dark-text/20 group-hover:border-l-transparent flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 origin-center">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                     <path d="M8 5v14l11-7z"/>
                   </svg>
                 </div>
               </a>
             </div>
           </div>

        </div>

      </div>
    </div>

"""

final_content = content.replace(marker, new_section + "\n    " + marker)

with open('src/app/home/home.component.html', 'w') as f:
    f.write(final_content)
    print("Injected Host section perfectly!")

