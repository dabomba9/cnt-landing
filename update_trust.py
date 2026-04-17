import sys

with open('src/app/home/home.component.html', 'r') as f:
    content = f.read()

start_marker = "<!-- Trust Signals Section -->"
end_marker = "<!-- Stats Section -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_html = """<!-- Trust Signals Section (GSAP Color Shift Target) -->
<section class="trust-dynamic-section py-32 md:py-64 overflow-hidden relative transition-colors duration-700 w-full" style="background-color: transparent;">
  <!-- We apply the GSAP color shift directly to this section's background and typography -->
  <div class="max-w-[90rem] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
    
    <!-- Left Column (Typography & Badges) -->
    <div class="lg:pr-8">
      <span class="trust-label text-jungle-green font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold mb-6 block transition-colors duration-700">
        The Highest Standard
      </span>
      <h2 class="trust-heading text-5xl md:text-6xl font-headline font-bold text-dark-text mb-8 leading-tight transition-colors duration-700">
        Professional, safe, and outdoorsy
      </h2>
      <p class="trust-desc text-muted-text text-lg mb-12 leading-relaxed max-w-xl transition-colors duration-700">
        We believe freedom shouldn't come with compromise. CurbNTurf partners only with hosts who meet our rigorous standards for technical reliability and safety.
      </p>

      <!-- Glassmorphic Badges -->
      <div class="flex flex-wrap gap-4 mb-16">
        <div class="trust-badge flex items-center gap-2 px-6 py-3 rounded-full border border-black/10 transition-all duration-700 group hover:-translate-y-1 hover:shadow-lg">
          <span class="material-symbols-outlined text-trinidad text-sm" data-icon="verified_user">verified_user</span>
          <span class="text-[0.7rem] font-bold uppercase tracking-wider trust-badge-text text-dark-text transition-colors duration-700">Verified Host</span>
        </div>
        <div class="trust-badge flex items-center gap-2 px-6 py-3 rounded-full border border-black/10 transition-all duration-700 group hover:-translate-y-1 hover:shadow-lg">
          <span class="material-symbols-outlined text-trinidad text-sm" data-icon="straighten">straighten</span>
          <span class="text-[0.7rem] font-bold uppercase tracking-wider trust-badge-text text-dark-text transition-colors duration-700">Rig-Compatible Guarantee</span>
        </div>
        <div class="trust-badge flex items-center gap-2 px-6 py-3 rounded-full border border-black/10 transition-all duration-700 group hover:-translate-y-1 hover:shadow-lg">
          <span class="material-symbols-outlined text-trinidad text-sm" data-icon="lock">lock</span>
          <span class="text-[0.7rem] font-bold uppercase tracking-wider trust-badge-text text-dark-text transition-colors duration-700">Secure Booking</span>
        </div>
      </div>

      <!-- 3D CTA Button -->
      <div class="btn-3d-wrap magnetic-btn">
        <div class="btn-3d-inner rounded-full cta-shadow cursor-pointer" style="width: auto;">
          <div class="invisible px-10 py-4 whitespace-nowrap font-button font-normal not-italic text-xs md:text-sm tracking-widest uppercase">
            Learn About Our Model
          </div>
          <div class="btn-3d-front bg-trinidad text-white rounded-full flex items-center justify-center whitespace-nowrap absolute inset-0 font-button font-normal not-italic text-xs md:text-sm tracking-widest uppercase">
            Learn About Our Model
          </div>
          <div class="btn-3d-back bg-jungle-green text-white rounded-full flex items-center justify-center whitespace-nowrap absolute inset-0 font-button font-normal not-italic text-xs md:text-sm tracking-widest uppercase">
            Learn About Our Model
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column (3D Carousel Physics) -->
    <div class="relative w-full h-[600px] md:h-[700px] perspective-[1500px] overflow-hidden rounded-[2rem] px-4 py-8 pointer-events-none" style="-webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);">
      <!-- Inner rotated envelope -->
      <div class="w-full h-full transform-style-3d rotate-y-[-5deg] rotate-x-[5deg] scale-[1.05]">
        <!-- Vertical Marquee Track -->
        <div class="trust-marquee-track flex flex-col gap-6 w-full max-w-md ml-auto mr-auto transform-style-3d will-change-transform">
          
          <!-- Card Suite Alpha -->
          <div class="trust-card pointer-events-auto p-8 rounded-2xl bg-black/5 backdrop-blur-xl shadow-lg border transition-colors duration-700">
            <div class="flex gap-1 text-gold mb-4 text-sm"><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span></div>
            <blockquote class="text-xl font-headline italic mb-6 trust-card-text text-dark-text transition-colors duration-700">"CurbNTurf completely changed how we travel. It's premium freedom."</blockquote>
            <div class="font-bold text-sm trust-card-text text-dark-text transition-colors duration-700">Marcus Sterling</div><div class="text-xs text-muted-text transition-colors duration-700 trust-muted-text">Full-time Airstreamer</div>
          </div>

          <div class="trust-card pointer-events-auto p-8 rounded-2xl bg-black/5 backdrop-blur-xl shadow-lg border transition-colors duration-700">
            <div class="flex gap-1 text-gold mb-4 text-sm"><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span></div>
            <blockquote class="text-xl font-headline italic mb-6 trust-card-text text-dark-text transition-colors duration-700">"The absolute easiest way to find guaranteed high-clearance properties."</blockquote>
            <div class="font-bold text-sm trust-card-text text-dark-text transition-colors duration-700">Elena Rostova</div><div class="text-xs text-muted-text transition-colors duration-700 trust-muted-text">Digital Nomad</div>
          </div>

          <div class="trust-card pointer-events-auto p-8 rounded-2xl bg-black/5 backdrop-blur-xl shadow-lg border transition-colors duration-700">
            <div class="flex gap-1 text-gold mb-4 text-sm"><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span></div>
            <blockquote class="text-xl font-headline italic mb-6 trust-card-text text-dark-text transition-colors duration-700">"We docked next to an active vineyard. Safest sleep we've had on the road."</blockquote>
            <div class="font-bold text-sm trust-card-text text-dark-text transition-colors duration-700">David & Sarah Kim</div><div class="text-xs text-muted-text transition-colors duration-700 trust-muted-text">Retiree Explorers</div>
          </div>

          <!-- Card Suite Beta (Duplicate for smooth infinite scrolling) -->
          <div class="trust-card pointer-events-auto p-8 rounded-2xl bg-black/5 backdrop-blur-xl shadow-lg border transition-colors duration-700">
            <div class="flex gap-1 text-gold mb-4 text-sm"><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span></div>
            <blockquote class="text-xl font-headline italic mb-6 trust-card-text text-dark-text transition-colors duration-700">"CurbNTurf completely changed how we travel. It's premium freedom."</blockquote>
            <div class="font-bold text-sm trust-card-text text-dark-text transition-colors duration-700">Marcus Sterling</div><div class="text-xs text-muted-text transition-colors duration-700 trust-muted-text">Full-time Airstreamer</div>
          </div>

          <div class="trust-card pointer-events-auto p-8 rounded-2xl bg-black/5 backdrop-blur-xl shadow-lg border transition-colors duration-700">
            <div class="flex gap-1 text-gold mb-4 text-sm"><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span></div>
            <blockquote class="text-xl font-headline italic mb-6 trust-card-text text-dark-text transition-colors duration-700">"The absolute easiest way to find guaranteed high-clearance properties."</blockquote>
            <div class="font-bold text-sm trust-card-text text-dark-text transition-colors duration-700">Elena Rostova</div><div class="text-xs text-muted-text transition-colors duration-700 trust-muted-text">Digital Nomad</div>
          </div>

          <div class="trust-card pointer-events-auto p-8 rounded-2xl bg-black/5 backdrop-blur-xl shadow-lg border transition-colors duration-700">
            <div class="flex gap-1 text-gold mb-4 text-sm"><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span><span class="material-symbols-outlined" data-icon="star" data-weight="fill">star</span></div>
            <blockquote class="text-xl font-headline italic mb-6 trust-card-text text-dark-text transition-colors duration-700">"We docked next to an active vineyard. Safest sleep we've had on the road."</blockquote>
            <div class="font-bold text-sm trust-card-text text-dark-text transition-colors duration-700">David & Sarah Kim</div><div class="text-xs text-muted-text transition-colors duration-700 trust-muted-text">Retiree Explorers</div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</section>
"""
    
    final_html = content[:start_idx] + new_html + content[end_idx:]
    with open('src/app/home/home.component.html', 'w') as f:
        f.write(final_html)
    print("Successfully replaced layout!")
else:
    print("Could not find markers!")
