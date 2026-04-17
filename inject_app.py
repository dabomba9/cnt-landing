import sys

with open('src/app/home/home.component.html', 'r') as f:
    content = f.read()

# We need to insert our DOM just before the closing tag of .trust-dynamic-section
# Let's find the trust-dynamic-section declaration
idx_start = content.find('trust-dynamic-section')

if idx_start != -1:
    # Find the closing tag of this section
    idx_end = content.find('</section>', idx_start)
    if idx_end != -1:
        new_html = """
  <!-- ================= App Download Section (Inherits GSAP Green Background) ================= -->
  <div class="max-w-[90rem] mx-auto px-4 md:px-8 mt-32 md:pb-16 pt-16 border-t border-white/10">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center gsap-app-download-wrap">
      
      <!-- Left Column: Copy & Features -->
      <div class="gsap-app-left relative z-10 opacity-0 transform translate-y-10">
        <div class="w-16 h-[2px] bg-[#F1B434] mb-8"></div>
        <div class="text-[#F1B434] font-bold tracking-wider uppercase text-sm mb-4">We have the tools to get you there.</div>
        <h2 class="text-5xl md:text-6xl font-headline font-bold text-white mb-8 leading-tight">
          Escape with us.
        </h2>

        <div class="space-y-8 text-white font-medium"> <!-- Increased base text size/spacing -->
          <div>
            <span class="text-[#F1B434] font-bold pr-1">Find it.</span>
            CurbNTurf delivers more technology tools with advanced features.
            <ul class="mt-4 space-y-3 text-white/90">
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                High-powered pre-scouting that delivers accurate information.
              </li>
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                Full search capabilities.
              </li>
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                Direct communication between host and guest.
              </li>
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                GPS coordinates and turn-by-turn driving directions.
              </li>
            </ul>
          </div>

          <div class="pt-2">
            <span class="text-[#F1B434] font-bold pr-1">Experience it.</span>
            CurbNTurf takes you where you want to go.
            <ul class="mt-4 space-y-3 text-white/90">
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                The tried-and-true, the traditional, the familiar.
              </li>
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                The unusual, the unexpected, the unconventional.
              </li>
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                If you can imagine it, we'll help you find it.
              </li>
            </ul>
          </div>

          <div class="pt-2">
            <span class="text-[#F1B434] font-bold pr-1">Share it.</span>
            CurbNTurf is all about community.
            <ul class="mt-4 space-y-3 text-white/90">
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                Advanced rating system.
              </li>
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[#F1B434] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                Ambassador programs to help promote the mission of CurbNTurf and offer enhanced experiences to guests.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Right Column: Phones & CTA -->
      <div class="gsap-app-right flex flex-col items-center justify-center relative z-10 w-full opacity-0 transform translate-y-10">
        <!-- The Floating Phones Mockup -->
        <div class="w-full max-w-[600px] mb-8 lg:mb-12 gsap-app-phones will-change-transform">
          <img src="assets/images/app-mockup.png" alt="CurbNTurf Mobile App" class="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-contain">
        </div>

        <div class="text-[#F1B434] text-[22px] font-headline font-bold uppercase tracking-widest mb-8 text-center">
          Free to download, free to use.
        </div>

        <!-- CSS Native App Store Buttons -->
        <div class="flex flex-row flex-wrap justify-center gap-4 w-full">
          <!-- App Store Button -->
          <a href="#" class="flex items-center bg-black hover:bg-[#1a1a1a] text-white border border-gray-800 rounded-xl px-6 py-3 shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] transition-all hover:scale-105 duration-300 min-w-[210px]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="w-9 h-9 mr-3 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.7 90.4-82.5 102.7-119.3-65.2-30.7-61.7-90-62-91.3zM207.6 109.1c20.6-21.1 33.9-49.8 29.3-80.1-26.4 1.5-56.3 18.2-76.4 39.3-22.6 22.8-37.5 53.3-32.9 84.8 28.8 2.1 57-19.7 80-44z"/></svg>
            <div class="flex flex-col text-left">
              <span class="text-[11px] leading-tight font-medium text-gray-300 tracking-wide">Download on the</span>
              <span class="text-[20px] leading-tight font-medium tracking-tight">App Store</span>
            </div>
          </a>
          
          <!-- Google Play Button -->
          <a href="#" class="flex items-center bg-black hover:bg-[#1a1a1a] text-white border border-gray-800 rounded-xl px-6 py-3 shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] transition-all hover:scale-105 duration-300 min-w-[210px]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-8 h-8 mr-4"><path fill="#67c15e" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z"/><path fill="#ea4335" d="M104.6 13L22.9 61.4c-8.9 5.2-14.8 14.8-14.8 25.6v338c0 10.8 5.9 20.4 14.8 25.6l81.7 48.4V13z"/><path fill="#fbbc04" d="M325.3 234.3l60.1-60.1-60.1-60.1-220.7-101z"/><path fill="#4285f4" d="M385.4 174.2l-60.1 60.1 60.1 60.1L489 237c15.2-8.8 15.2-30.8 0-39.6l-103.6-23.2z"/></svg>
            <div class="flex flex-col text-left">
              <span class="text-[11px] leading-tight font-medium text-gray-300 tracking-wide uppercase">Get It On</span>
              <span class="text-[19px] leading-tight font-medium tracking-tight">Google Play</span>
            </div>
          </a>
        </div>

      </div>

    </div>
  </div>
"""
        final_content = content[:idx_end] + new_html + content[idx_end:]
        with open('src/app/home/home.component.html', 'w') as f:
            f.write(final_content)
        print("Injected strictly securely inside the trust section perfectly!")
    else:
        print("Could not find </section>!")
else:
    print("Could not find anchor!")

