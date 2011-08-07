module ApplicationHelper
  # require 'dir'
  
  def url_for_category(category)
    if category.sub_categories.size > 0
      sub_category_furniture_index_path( :sub_category_id => category.sub_categories.first )
    else
      category_furniture_index_path(:category_id => category)
    end
  end
  
  def home_page
    {
      :name => (I18n.locale == :lv ? "Sākumlapa" : "Главная"),
      :key => "home_page",
      :url => categories_path,
      :options => { :container_id => 'main_menu', :class => "category", :highlights_on => /^.*\/(lv|ru)?(\/categories)?$/}
    }
  end
  
  def contacts
    {
      :name => (I18n.locale == :lv ? "Kontakti" : "Контакты"),
      :key => "contacts",
      :url => contacts_categories_path,
      :options => { :container_id => 'main_menu', :class => "category" }
    }
  end
  
  def sub_menu_items(category)
    category.sub_categories.sort_by(&:priority).map do |sc|
      {
        :key => sc.key,
        :name => sc.name,
        :url => sub_category_furniture_index_path( :sub_category_id => sc ),
        :options => { :container_id => "sub_menu" }
      }
    end
  end
  
  def menu_items
    items = Category.all.map do |category|
      {
        :name => category.name,
        :key => "main_#{category.id}".to_sym,
        :url => url_for_category(category),
        :options => { :container_id => 'main_menu', :class => "category" },
        :items => sub_menu_items(category)
      }
    end
    
    items.insert(0, home_page)
    items.insert(-1, contacts)
  end
  
  def furniture_url(f)
    category_furniture_path(:id => f, :category_id => f.category)
  end
  
  def last_furniture_row
    ( @furniture.size.to_f / @furniture_per_row.to_f + 0.5 ).round.to_i 
  end
  
  def sliced_furniture_array(nr)
    nr -= 1
    @furniture.slice(nr*@furniture_per_row, @furniture_per_row)
  end
  
  def furniture_form_url
    @furniture.new_record? ? admin_furniture_index_path : admin_furniture_path
  end
  
  def under_construction_msg
    (I18n.locale == :lv ? "Lapa tiek papildināta" : "Раздел дополняется")
  end
  
  def current_url
    request.url
  end
  
  def args_for_gallery
    Dir.chdir("#{RAILS_ROOT}/public/images/gallery")
    Dir.glob("*.jpg").map do |f| 
      f = "gallery/#{f}"
      "'#{image_path f}'"
    end.join(" , ")
  end
  
  def title
    (I18n.locale == :lv ? "Par mums" : "О нас")
  end
  
  def link_to_contacts
    link_to (I18n.locale == :lv ? "Kontakti" : "Контакты"), contacts_categories_path
  end
end
