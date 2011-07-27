module ApplicationHelper
  def url_for_category(category)
    if category.sub_categories.size > 1
      category_sub_categories :category => category
    elsif category.sub_categories.size == 1
      sub_category_furniture_index_path :sub_category => category.sub_categories.first
    else
      category_furniture_index_path(:category_id => category)
    end
  end
  
  def sub_menu_items(category)
    category.sub_categories.map do |sc|
      {
        :key => sc.key,
        :name => sc.name,
        :url => sub_category_furniture_index_path( :sub_category => sc )
      }
    end
  end
  
  def menu_items
    Category.all.map do |category|
      {
        :name => category.name,
        :key => "main_#{category.id}".to_sym,
        :url => url_for_category(category),
        :options => { :container_id => 'main_menu' }
        # :items => sub_menu_items(category)
      }
    end
  end
end
