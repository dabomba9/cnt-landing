import sys

with open('src/app/home/home.component.html', 'r') as f:
    content = f.read()

start_marker = "<!-- ================= App Download Section (Inherits GSAP Green Background) ================= -->"
end_marker = "<!-- End of App Download Section -->" # I didn't add an end marker earlier!

# Let's find the exact block computationally
idx_app = content.find(start_marker)
if idx_app == -1:
    print("Cannot find App Download start marker")
    sys.exit(1)

# Search for the immediate next </section> which belongs to trust-dynamic-section
idx_section_close = content.find('</section>', idx_app)

if idx_section_close == -1:
    print("Cannot find closing section")
    sys.exit(1)

new_html = """
  <!-- ================= App Download Section (Standalone Cream Layout) ================= -->
  <section class="py-24 md:py-48 bg-background relative overflow-hidden w-full">
    <div class="max-w-[85rem] mx-auto px-4 md:px-8">
      
      <!-- Rounded Cream Card -->
      <div class="w-full bg-[#F5F3EC] rounded-[2.5rem] p-10 md:p-16 lg:p-24 grid grid-cols-1 lg:grid-cols-2 lg:gap-24 items-center gsap-app-download-wrap relative z-10 shadow-sm border border-black/5">
        
        <!-- Left Column: Phones Mockup -->
        <div class="gsap-app-left w-full max-w-[500px] mx-auto mb-16 lg:mb-0 opacity-0 transform translate-y-10 order-2 lg:order-1 relative">
          <!-- The Floating Phones Mockup -->
          <div class="w-full gsap-app-phones will-change-transform">
            <img src="assets/images/app-mockup.png" alt="CurbNTurf Mobile App" class="w-full h-auto drop-shadow-2xl object-contain">
          </div>
        </div>

        <!-- Right Column: Copy & Features -->
        <div class="gsap-app-right opacity-0 transform translate-y-10 order-1 lg:order-2">
          <div class="w-16 h-[3px] bg-[#295D42] mb-8 rounded-full"></div>
          <div class="text-[#295D42] font-bold tracking-wider uppercase text-sm mb-4">We have the tools to get you there.</div>
          <h2 class="text-5xl md:text-6xl font-headline font-bold text-dark-text mb-8 leading-tight">
            Escape with us.
          </h2>

          <div class="space-y-8 text-dark-text font-medium mb-12">
            <div>
              <span class="text-[#295D42] font-bold pr-1">Find it.</span>
              CurbNTurf delivers more technology tools with advanced features.
              <ul class="mt-4 space-y-3 text-muted-text">
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  High-powered pre-scouting that delivers accurate information.
                </li>
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  Full search capabilities.
                </li>
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  Direct communication between host and guest.
                </li>
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  GPS coordinates and turn-by-turn driving directions.
                </li>
              </ul>
            </div>

            <div class="pt-2">
              <span class="text-[#295D42] font-bold pr-1">Experience it.</span>
              CurbNTurf takes you where you want to go.
              <ul class="mt-4 space-y-3 text-muted-text">
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  The tried-and-true, the traditional, the familiar.
                </li>
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  The unusual, the unexpected, the unconventional.
                </li>
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  If you can imagine it, we'll help you find it.
                </li>
              </ul>
            </div>

            <div class="pt-2">
              <span class="text-[#295D42] font-bold pr-1">Share it.</span>
              CurbNTurf is all about community.
              <ul class="mt-4 space-y-3 text-muted-text">
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  Advanced rating system.
                </li>
                <li class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-[#295D42] mt-0.5 text-xl" data-icon="play_arrow">play_arrow</span>
                  Ambassador programs to help promote the mission of CurbNTurf and offer enhanced experiences to guests.
                </li>
              </ul>
            </div>
          </div>

          <!-- Official App Store Badges -->
          <div class="text-[#295D42] text-[15px] font-headline font-semibold uppercase tracking-widest mb-4">
            Free to download, free to use.
          </div>
          <div class="flex flex-row flex-wrap gap-4 w-full justify-start">
            <a href="#" class="transition-transform hover:scale-105 hover:-translate-y-1 duration-300 shadow-sm rounded-[10px] bg-black inline-block">
              <img src="assets/images/app-store-badge.svg" alt="Download on the App Store" class="h-12 w-auto rounded-[10px]">
            </a>
            <a href="#" class="transition-transform hover:scale-105 hover:-translate-y-1 duration-300 shadow-sm rounded-[10px] bg-black inline-block flex items-center justify-center">
              <img src="assets/images/google-play-badge.svg" alt="Get it on Google Play" class="h-[1.6rem] ml-1 mr-3 w-auto my-auto self-center">
            </a>
          </div>

        </div>

      </div>
    </div>
  </section>
"""

# We slice out the old app content completely
# Replace from `start_marker` down to `idx_section_close`
old_content_head = content[:idx_app]
old_content_tail = content[idx_section_close:] # This includes `</section>`

final_content = old_content_head + old_content_tail + "\n" + new_html

with open('src/app/home/home.component.html', 'w') as f:
    f.write(final_content)
    print("Done")

